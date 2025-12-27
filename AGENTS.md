# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

### Backend (Rust)
```bash
cd backend
cargo build --release           # Build
cargo run --release             # Run (starts on :3001)
RUST_LOG=codecity_backend=info cargo run --release  # With logging
```

### Frontend (JavaScript/Vite)
```bash
cd frontend
npm install                     # Install dependencies
npm run dev                     # Dev server with hot reload (:3000)
npm run build                   # Production build → dist/
```

### Docker (Full Stack)
```bash
docker compose up --build       # Build and start both services
# Frontend: http://localhost:3000, Backend: http://localhost:3001
```

### Kubernetes
```bash
kubectl apply -k k8s/           # Deploy to cluster
kubectl port-forward -n codecity svc/frontend 3000:80
```

## Architecture Overview

CodeCity visualizes git repositories as 3D city buildings where:
- **Height** = repository age (days since first commit)
- **Volume** = lines of code
- **Color** = primary programming language

### Data Flow
```
User Input → api.js (fetch /api/*) → Backend API handlers
    → Git analysis (git2) → RepoAnalysis struct
    → JSON response → Frontend renders Three.js buildings
```

### Backend (Rust/Axum)
- `main.rs` - Server entry, router setup, CORS config
- `api/mod.rs` - REST handlers (7 endpoints: health, repos, analyze/local, analyze/github, scan, repo/{id}, repo/{id}/tree)
- `git/mod.rs` - Core analysis logic: line counting, directory tree building, language detection
- `github/mod.rs` - GitHub API integration with shallow cloning
- `models.rs` - Data structures, 35+ language color mappings

### Frontend (Vanilla JS/Three.js)
- `main.js` - CodeCity controller class, event coordination
- `scene.js` - Three.js setup, raycasting, camera/lighting
- `buildings.js` - Layout algorithms, dimension calculations
- `api.js` - HTTP client wrapper
- `ui.js` - DOM manipulation, tooltips, forms
- `colors.js` - Language color mappings (mirrors backend)

### Key Patterns

**State Management:** Backend uses `Arc<RwLock<HashMap<String, RepoAnalysis>>>` for in-memory repo storage (ephemeral).

**Parallel Processing:** Rayon for batch repo analysis in `scan_directory`.

**API Proxy:** Dev uses Vite proxy (`/api` → `:3001`), production uses nginx proxy.

**Two View Modes:**
- Repository View: each building = one repo
- City Blocks View: blocks = repos, buildings within = directories

### Directory Ignore List
The git analysis module ignores: `.git`, `node_modules`, `target`, `dist`, `build`, `.next`, `__pycache__`, `.venv`, `venv`, `.idea`, `.vscode`, `vendor`, `.cargo`, `deps`, `_build`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/repos` | List analyzed repos |
| POST | `/api/analyze/local` | Analyze local path `{"path": "/..."}` |
| POST | `/api/analyze/github` | Analyze GitHub `{"repo": "owner/repo"}` |
| POST | `/api/scan` | Scan directory `{"path": "/..."}` |
| GET | `/api/repo/{id}` | Get repo by ID |
| GET | `/api/repo/{id}/tree` | Get directory tree |

## Docker Path Mapping

When running in Docker, host filesystem is mounted at `/host/`:
- Host: `/Users/me/projects` → Container: `/host/Users/me/projects`
