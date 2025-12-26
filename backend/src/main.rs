mod api;
mod git;
mod github;
mod models;

use api::{
    analyze_github, analyze_local, get_repo, get_repo_tree, health, list_repos, scan_directory,
    RepoStore,
};
use axum::{
    routing::{get, post},
    Router,
};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "codecity_backend=debug,tower_http=debug".into()),
        )
        .init();

    // Create shared state
    let store: RepoStore = Arc::new(RwLock::new(HashMap::new()));

    // CORS configuration for development
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build router
    let app = Router::new()
        .route("/api/health", get(health))
        .route("/api/repos", get(list_repos))
        .route("/api/analyze/local", post(analyze_local))
        .route("/api/analyze/github", post(analyze_github))
        .route("/api/scan", post(scan_directory))
        .route("/api/repo/{id}", get(get_repo))
        .route("/api/repo/{id}/tree", get(get_repo_tree))
        .layer(cors)
        .with_state(store);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await.unwrap();
    tracing::info!("CodeCity backend listening on http://localhost:3001");

    axum::serve(listener, app).await.unwrap();
}
