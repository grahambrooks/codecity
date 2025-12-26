use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::git::{analyze_directory, analyze_repository, find_repositories};
use crate::github::analyze_github_repo;
use crate::models::{
    AnalyzeGithubRequest, AnalyzeLocalRequest, ErrorResponse, RepoAnalysis, ScanDirectoryRequest,
    ScanDirectoryResponse,
};

pub type RepoStore = Arc<RwLock<HashMap<String, RepoAnalysis>>>;

pub async fn health() -> impl IntoResponse {
    Json(json!({ "status": "ok" }))
}

pub async fn analyze_local(
    State(store): State<RepoStore>,
    Json(request): Json<AnalyzeLocalRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<ErrorResponse>)> {
    match analyze_repository(&request.path) {
        Ok(analysis) => {
            let id = analysis.id.clone();
            store.write().await.insert(id.clone(), analysis.clone());
            Ok((StatusCode::OK, Json(analysis)))
        }
        Err(e) => Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: e.to_string(),
            }),
        )),
    }
}

pub async fn analyze_github(
    State(store): State<RepoStore>,
    Json(request): Json<AnalyzeGithubRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<ErrorResponse>)> {
    match analyze_github_repo(&request.owner, &request.repo).await {
        Ok(analysis) => {
            let id = analysis.id.clone();
            store.write().await.insert(id.clone(), analysis.clone());
            Ok((StatusCode::OK, Json(analysis)))
        }
        Err(e) => Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: e.to_string(),
            }),
        )),
    }
}

pub async fn get_repo(
    State(store): State<RepoStore>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<ErrorResponse>)> {
    let repos = store.read().await;
    match repos.get(&id) {
        Some(repo) => Ok(Json(repo.clone())),
        None => Err((
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: "Repository not found".to_string(),
            }),
        )),
    }
}

pub async fn get_repo_tree(
    State(store): State<RepoStore>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<ErrorResponse>)> {
    let repos = store.read().await;
    match repos.get(&id) {
        Some(repo) => Ok(Json(repo.directories.clone())),
        None => Err((
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: "Repository not found".to_string(),
            }),
        )),
    }
}

pub async fn list_repos(State(store): State<RepoStore>) -> impl IntoResponse {
    let repos = store.read().await;
    let list: Vec<RepoAnalysis> = repos.values().cloned().collect();
    Json(list)
}

pub async fn scan_directory(
    State(store): State<RepoStore>,
    Json(request): Json<ScanDirectoryRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<ErrorResponse>)> {
    // First find all repositories
    let repo_paths = match find_repositories(&request.path) {
        Ok(paths) => paths,
        Err(e) => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: e.to_string(),
                }),
            ))
        }
    };

    let total_found = repo_paths.len();

    // Analyze all found repositories
    let analyses = match analyze_directory(&request.path) {
        Ok(a) => a,
        Err(e) => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: e.to_string(),
                }),
            ))
        }
    };

    let total_analyzed = analyses.len();

    // Store all analyzed repos
    {
        let mut store = store.write().await;
        for analysis in &analyses {
            store.insert(analysis.id.clone(), analysis.clone());
        }
    }

    Ok((
        StatusCode::OK,
        Json(ScanDirectoryResponse {
            repos: analyses,
            total_found,
            total_analyzed,
        }),
    ))
}
