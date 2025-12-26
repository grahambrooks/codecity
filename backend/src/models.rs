use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoAnalysis {
    pub id: String,
    pub name: String,
    pub path: String,
    pub age_days: u64,
    pub total_lines: u64,
    pub languages: Vec<LanguageBreakdown>,
    pub directories: Vec<DirectoryNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanguageBreakdown {
    pub language: String,
    pub lines: u64,
    pub percentage: f32,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectoryNode {
    pub name: String,
    pub path: String,
    pub age_days: u64,
    pub lines: u64,
    pub languages: Vec<LanguageBreakdown>,
    pub children: Vec<DirectoryNode>,
}

#[derive(Debug, Deserialize)]
pub struct AnalyzeLocalRequest {
    pub path: String,
}

#[derive(Debug, Deserialize)]
pub struct AnalyzeGithubRequest {
    pub owner: String,
    pub repo: String,
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

pub fn get_language_color(language: &str) -> &'static str {
    match language.to_lowercase().as_str() {
        "rust" => "#DEA584",
        "javascript" | "js" => "#F7DF1E",
        "typescript" | "ts" => "#3178C6",
        "python" | "py" => "#3776AB",
        "go" => "#00ADD8",
        "java" => "#B07219",
        "c++" | "cpp" => "#F34B7D",
        "c" => "#555555",
        "ruby" | "rb" => "#CC342D",
        "html" => "#E34C26",
        "css" => "#563D7C",
        "scss" | "sass" => "#C6538C",
        "json" => "#292929",
        "yaml" | "yml" => "#CB171E",
        "markdown" | "md" => "#083FA1",
        "shell" | "sh" | "bash" => "#89E051",
        "php" => "#4F5D95",
        "swift" => "#F05138",
        "kotlin" => "#A97BFF",
        "scala" => "#DC322F",
        "haskell" | "hs" => "#5E5086",
        "elixir" | "ex" => "#6E4A7E",
        "clojure" | "clj" => "#DB5855",
        "lua" => "#000080",
        "r" => "#198CE7",
        "dart" => "#00B4AB",
        "vue" => "#41B883",
        "svelte" => "#FF3E00",
        "sql" => "#E38C00",
        "graphql" | "gql" => "#E10098",
        "toml" => "#9C4221",
        "xml" => "#0060AC",
        _ => "#8B8B8B",
    }
}

pub fn get_language_from_extension(ext: &str) -> Option<&'static str> {
    match ext.to_lowercase().as_str() {
        "rs" => Some("Rust"),
        "js" | "mjs" | "cjs" => Some("JavaScript"),
        "ts" | "mts" | "cts" => Some("TypeScript"),
        "tsx" => Some("TypeScript"),
        "jsx" => Some("JavaScript"),
        "py" | "pyw" => Some("Python"),
        "go" => Some("Go"),
        "java" => Some("Java"),
        "cpp" | "cc" | "cxx" | "c++" => Some("C++"),
        "c" | "h" => Some("C"),
        "hpp" | "hxx" | "hh" => Some("C++"),
        "rb" => Some("Ruby"),
        "html" | "htm" => Some("HTML"),
        "css" => Some("CSS"),
        "scss" => Some("SCSS"),
        "sass" => Some("Sass"),
        "json" => Some("JSON"),
        "yaml" | "yml" => Some("YAML"),
        "md" | "markdown" => Some("Markdown"),
        "sh" | "bash" | "zsh" => Some("Shell"),
        "php" => Some("PHP"),
        "swift" => Some("Swift"),
        "kt" | "kts" => Some("Kotlin"),
        "scala" | "sc" => Some("Scala"),
        "hs" | "lhs" => Some("Haskell"),
        "ex" | "exs" => Some("Elixir"),
        "clj" | "cljs" | "cljc" => Some("Clojure"),
        "lua" => Some("Lua"),
        "r" => Some("R"),
        "dart" => Some("Dart"),
        "vue" => Some("Vue"),
        "svelte" => Some("Svelte"),
        "sql" => Some("SQL"),
        "graphql" | "gql" => Some("GraphQL"),
        "toml" => Some("TOML"),
        "xml" => Some("XML"),
        _ => None,
    }
}
