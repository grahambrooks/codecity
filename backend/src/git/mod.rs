use crate::models::{
    get_language_color, get_language_from_extension, DirectoryNode, LanguageBreakdown,
    RepoAnalysis,
};
use chrono::Utc;
use git2::Repository;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use thiserror::Error;
use uuid::Uuid;
use walkdir::WalkDir;

#[derive(Error, Debug)]
pub enum GitError {
    #[error("Failed to open repository: {0}")]
    OpenRepo(#[from] git2::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Repository has no commits")]
    NoCommits,
    #[error("Invalid repository path")]
    InvalidPath,
}

pub fn analyze_repository(path: &str) -> Result<RepoAnalysis, GitError> {
    let repo_path = Path::new(path);
    if !repo_path.exists() {
        return Err(GitError::InvalidPath);
    }

    let repo = Repository::open(repo_path)?;
    let repo_name = repo_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    // Get repository age from first commit
    let age_days = get_repo_age_days(&repo)?;

    // Analyze files
    let (total_lines, language_stats, directories) = analyze_files(repo_path)?;

    // Convert language stats to breakdown
    let languages = calculate_language_breakdown(&language_stats, total_lines);

    Ok(RepoAnalysis {
        id: Uuid::new_v4().to_string(),
        name: repo_name,
        path: path.to_string(),
        age_days,
        total_lines,
        languages,
        directories,
    })
}

fn get_repo_age_days(repo: &Repository) -> Result<u64, GitError> {
    let mut revwalk = repo.revwalk()?;
    revwalk.push_head()?;
    revwalk.set_sorting(git2::Sort::TIME | git2::Sort::REVERSE)?;

    // Get the first (oldest) commit
    if let Some(oid_result) = revwalk.next() {
        let oid = oid_result?;
        let commit = repo.find_commit(oid)?;
        let commit_time = commit.time().seconds();
        let now = Utc::now().timestamp();
        let age_seconds = now - commit_time;
        return Ok((age_seconds / 86400) as u64);
    }

    Err(GitError::NoCommits)
}

fn analyze_files(
    repo_path: &Path,
) -> Result<(u64, HashMap<String, u64>, Vec<DirectoryNode>), GitError> {
    let mut total_lines = 0u64;
    let mut language_stats: HashMap<String, u64> = HashMap::new();
    let mut dir_stats: HashMap<String, DirStats> = HashMap::new();

    for entry in WalkDir::new(repo_path)
        .into_iter()
        .filter_entry(|e| !is_ignored(e.path(), repo_path))
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            if let Some(ext) = entry.path().extension() {
                if let Some(language) = get_language_from_extension(&ext.to_string_lossy()) {
                    if let Ok(content) = fs::read_to_string(entry.path()) {
                        let lines = content.lines().count() as u64;
                        total_lines += lines;
                        *language_stats.entry(language.to_string()).or_insert(0) += lines;

                        // Track directory stats
                        if let Some(parent) = entry.path().parent() {
                            let rel_path = parent
                                .strip_prefix(repo_path)
                                .unwrap_or(parent)
                                .to_string_lossy()
                                .to_string();
                            let dir_stat = dir_stats.entry(rel_path).or_insert_with(DirStats::new);
                            dir_stat.lines += lines;
                            *dir_stat.languages.entry(language.to_string()).or_insert(0) += lines;
                        }
                    }
                }
            }
        }
    }

    // Build directory tree
    let directories = build_directory_tree(repo_path, &dir_stats)?;

    Ok((total_lines, language_stats, directories))
}

#[derive(Default)]
struct DirStats {
    lines: u64,
    languages: HashMap<String, u64>,
}

impl DirStats {
    fn new() -> Self {
        Self::default()
    }
}

fn build_directory_tree(
    repo_path: &Path,
    dir_stats: &HashMap<String, DirStats>,
) -> Result<Vec<DirectoryNode>, GitError> {
    let mut root_dirs: Vec<DirectoryNode> = Vec::new();
    let mut dir_map: HashMap<String, DirectoryNode> = HashMap::new();

    // Create nodes for all directories
    for (path, stats) in dir_stats {
        let name = Path::new(path)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| path.clone());

        let languages = calculate_language_breakdown(&stats.languages, stats.lines);

        let node = DirectoryNode {
            name: if name.is_empty() {
                "(root)".to_string()
            } else {
                name
            },
            path: path.clone(),
            age_days: get_directory_age(repo_path, path).unwrap_or(0),
            lines: stats.lines,
            languages,
            children: Vec::new(),
        };

        dir_map.insert(path.clone(), node);
    }

    // Build hierarchy
    let paths: Vec<String> = dir_map.keys().cloned().collect();
    for path in &paths {
        if path.is_empty() {
            continue;
        }
        let parent_path = Path::new(path)
            .parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();

        if let Some(node) = dir_map.remove(path) {
            if parent_path.is_empty() || !dir_map.contains_key(&parent_path) {
                root_dirs.push(node);
            } else if let Some(parent) = dir_map.get_mut(&parent_path) {
                parent.children.push(node);
            } else {
                root_dirs.push(node);
            }
        }
    }

    // Add root directory if it exists
    if let Some(root) = dir_map.remove("") {
        root_dirs.insert(0, root);
    }

    // Sort by lines of code
    root_dirs.sort_by(|a, b| b.lines.cmp(&a.lines));

    Ok(root_dirs)
}

fn get_directory_age(repo_path: &Path, dir_path: &str) -> Result<u64, GitError> {
    let repo = Repository::open(repo_path)?;
    let full_path = if dir_path.is_empty() {
        repo_path.to_path_buf()
    } else {
        repo_path.join(dir_path)
    };

    // Find oldest commit that touches this directory
    let mut revwalk = repo.revwalk()?;
    revwalk.push_head()?;
    revwalk.set_sorting(git2::Sort::TIME | git2::Sort::REVERSE)?;

    for oid_result in revwalk {
        let oid = oid_result?;
        let commit = repo.find_commit(oid)?;

        // Check if this commit touches the directory
        if let Ok(tree) = commit.tree() {
            let rel_path = full_path
                .strip_prefix(repo_path)
                .unwrap_or(full_path.as_path());
            if rel_path.as_os_str().is_empty() || tree.get_path(rel_path).is_ok() {
                let commit_time = commit.time().seconds();
                let now = Utc::now().timestamp();
                let age_seconds = now - commit_time;
                return Ok((age_seconds / 86400) as u64);
            }
        }
    }

    Ok(0)
}

fn calculate_language_breakdown(
    stats: &HashMap<String, u64>,
    total: u64,
) -> Vec<LanguageBreakdown> {
    if total == 0 {
        return Vec::new();
    }

    let mut breakdown: Vec<LanguageBreakdown> = stats
        .iter()
        .map(|(lang, &lines)| LanguageBreakdown {
            language: lang.clone(),
            lines,
            percentage: (lines as f32 / total as f32) * 100.0,
            color: get_language_color(lang).to_string(),
        })
        .collect();

    breakdown.sort_by(|a, b| b.lines.cmp(&a.lines));
    breakdown
}

fn is_ignored(path: &Path, repo_path: &Path) -> bool {
    let rel_path = path.strip_prefix(repo_path).unwrap_or(path);
    let path_str = rel_path.to_string_lossy();

    // Common ignored directories
    let ignored = [
        ".git",
        "node_modules",
        "target",
        "dist",
        "build",
        ".next",
        "__pycache__",
        ".venv",
        "venv",
        ".idea",
        ".vscode",
        "vendor",
        ".cargo",
        "deps",
        "_build",
    ];

    for component in rel_path.components() {
        if let std::path::Component::Normal(name) = component {
            let name_str = name.to_string_lossy();
            if ignored.contains(&name_str.as_ref()) {
                return true;
            }
        }
    }

    // Ignore hidden files/dirs (except root)
    if path_str.contains("/.") && !path_str.starts_with(".git") {
        return true;
    }

    false
}
