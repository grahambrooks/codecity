# CodeCity

A 3D visualization tool that renders git repositories as buildings in a city. Each building's characteristics represent different aspects of the repository:

- **Height** = Repository/directory age (days since first commit)
- **Volume** = Lines of code
- **Color** = Primary programming language

## Features

- Visualize local git repositories or GitHub repositories
- Toggle between repository view and directory drill-down view
- Scan entire directories for all git repositories
- Interactive 3D navigation with orbit controls
- Hover tooltips showing repository statistics
- City blocks view showing all repositories with their directories

## Quick Start with Docker

The easiest way to run CodeCity is using Docker Compose:

```bash
# Clone the repository
git clone https://github.com/grahambrooks/codecity.git
cd codecity

# Build and start the containers
docker compose up --build

# Access the application
open http://localhost:3000
```

### Docker Notes

When running in Docker, local repository paths must be prefixed with `/host/` since the host filesystem is mounted at that location. For example:
- Host path: `/Users/me/projects`
- Container path: `/host/Users/me/projects`

## Manual Build

### Prerequisites

- **Backend**: Rust 1.70+ with Cargo
- **Frontend**: Node.js 18+ with npm
- **System**: git, libssl-dev, pkg-config, cmake (for libgit2)

### Backend

```bash
cd backend

# Build
cargo build --release

# Run
cargo run --release
```

The backend server starts on `http://localhost:3001`.

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Development server (with hot reload)
npm run dev

# Production build
npm run build
```

The development server starts on `http://localhost:3000` and proxies API requests to the backend.

## Usage

### Analyze a Single Repository

1. **Local Repository**: Enter the full path to a git repository and click "Analyze Local Repo"
2. **GitHub Repository**: Enter `owner/repo` format (e.g., `rust-lang/rust`) and click "Analyze GitHub Repo"

### Scan Multiple Repositories

1. Enter a directory path containing multiple git repositories
2. Click "Scan All Subdirectories"
3. All discovered repositories will be analyzed and added to the visualization

### Navigation

- **Left-click + drag**: Rotate the camera
- **Right-click + drag**: Pan the camera
- **Scroll**: Zoom in/out
- **Hover**: Show repository/directory details
- **Click** (in repo view): Switch to directory view for that repository

### Views

- **Repositories**: Each building represents one git repository
- **City Blocks**: Each block represents a repository, with buildings for each directory inside

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/repos` | List all analyzed repositories |
| POST | `/api/analyze/local` | Analyze a local repository |
| POST | `/api/analyze/github` | Analyze a GitHub repository |
| POST | `/api/scan` | Scan directory for repositories |
| GET | `/api/repo/{id}` | Get repository details |
| GET | `/api/repo/{id}/tree` | Get repository directory tree |

## Project Structure

```
codecity/
├── backend/                 # Rust API server
│   ├── Cargo.toml
│   ├── Dockerfile
│   └── src/
│       ├── main.rs          # Entry point, Axum server
│       ├── models.rs        # Data structures
│       ├── api/mod.rs       # REST API handlers
│       ├── git/mod.rs       # Git repository analysis
│       └── github/mod.rs    # GitHub API integration
├── frontend/                # Three.js visualization
│   ├── package.json
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.js          # Application entry
│       ├── scene.js         # Three.js 3D scene
│       ├── buildings.js     # Building geometry
│       ├── api.js           # API client
│       ├── ui.js            # UI controls
│       └── colors.js        # Language colors
├── docker-compose.yml
└── README.md
```

## Language Colors

The visualization uses GitHub's language colors:

| Language | Color |
|----------|-------|
| Rust | #DEA584 |
| JavaScript | #F7DF1E |
| TypeScript | #3178C6 |
| Python | #3776AB |
| Go | #00ADD8 |
| Java | #B07219 |
| C++ | #F34B7D |
| Ruby | #CC342D |

...and 20+ more languages.

## Technology Stack

### Backend
- **Rust** with Axum web framework
- **git2** for Git operations (libgit2 bindings)
- **octocrab** for GitHub API
- **tokio** async runtime

### Frontend
- **Three.js** for 3D rendering
- **Vite** for development/build
- Vanilla JavaScript (no framework)

## License

MIT
