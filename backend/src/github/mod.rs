use crate::git::{analyze_repository, GitError};
use crate::models::RepoAnalysis;
use octocrab::Octocrab;
use std::process::Command;
use tempfile::TempDir;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum GithubError {
    #[error("GitHub API error: {0}")]
    Api(#[from] octocrab::Error),
    #[error("Git clone failed: {0}")]
    Clone(String),
    #[error("Git analysis error: {0}")]
    Analysis(#[from] GitError),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

pub async fn analyze_github_repo(owner: &str, repo: &str) -> Result<RepoAnalysis, GithubError> {
    // Get repo info from GitHub API
    let octocrab = Octocrab::builder().build()?;
    let repo_info = octocrab.repos(owner, repo).get().await?;

    let clone_url = repo_info
        .clone_url
        .ok_or_else(|| GithubError::Clone("No clone URL available".to_string()))?;

    // Clone to temp directory
    let temp_dir = TempDir::new()?;
    let temp_path = temp_dir.path();

    // Shallow clone for faster analysis
    let output = Command::new("git")
        .args([
            "clone",
            "--depth",
            "1",
            "--single-branch",
            clone_url.as_str(),
            temp_path.to_str().unwrap(),
        ])
        .output()?;

    if !output.status.success() {
        return Err(GithubError::Clone(
            String::from_utf8_lossy(&output.stderr).to_string(),
        ));
    }

    // For age, we need to fetch the first commit
    // Do a separate fetch for the oldest commit
    let _ = Command::new("git")
        .args(["fetch", "--deepen=2147483647"])
        .current_dir(temp_path)
        .output();

    // Analyze the cloned repo
    let mut analysis = analyze_repository(temp_path.to_str().unwrap())?;

    // Override name with GitHub repo name
    analysis.name = format!("{}/{}", owner, repo);
    analysis.path = clone_url.to_string();

    Ok(analysis)
}
