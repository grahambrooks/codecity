import { Scene } from './scene.js';
import { UI } from './ui.js';
import { layoutBuildings, layoutCityBlocks } from './buildings.js';
import { analyzeLocalRepo, analyzeGithubRepo, getRepos } from './api.js';

class CodeCity {
  constructor() {
    this.scene = new Scene(document.getElementById('canvas-container'));
    this.ui = new UI();
    this.repos = [];
    this.currentView = 'repos';
    this.selectedRepo = null;

    this.setupEventHandlers();
    this.loadExistingRepos();
  }

  setupEventHandlers() {
    // Scene events
    this.scene.onHover = (data, x, y) => {
      this.ui.showTooltip(data, x, y);
    };

    this.scene.onSelect = (data) => {
      if (this.currentView === 'repos') {
        // Find the full repo data and switch to directory view
        const repo = this.repos.find((r) => r.id === data.id);
        if (repo) {
          this.selectedRepo = repo;
          this.currentView = 'dirs';
          this.renderCityBlocksView();
        }
      }
    };

    // UI events
    this.ui.elements.analyzeLocal.addEventListener('click', () => {
      this.analyzeLocal();
    });

    this.ui.elements.analyzeGithub.addEventListener('click', () => {
      this.analyzeGithub();
    });

    this.ui.elements.localPath.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.analyzeLocal();
      }
    });

    this.ui.elements.githubRepo.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.analyzeGithub();
      }
    });

    this.ui.onViewChange = (view) => {
      this.currentView = view;
      if (view === 'repos') {
        this.renderRepoView();
      } else if (view === 'dirs') {
        this.renderCityBlocksView();
      }
    };

    this.ui.onRepoSelect = (repo) => {
      this.selectedRepo = repo;
      if (this.currentView === 'repos') {
        // Highlight the selected building
        this.highlightBuilding(repo.id);
      }
      // In directory view, selection just updates the UI highlight
    };

    // View toggle
    this.ui.elements.viewRepos.addEventListener('click', () => {
      this.currentView = 'repos';
      this.ui.setView('repos');
      this.renderRepoView();
    });

    this.ui.elements.viewDirs.addEventListener('click', () => {
      this.currentView = 'dirs';
      this.ui.setView('dirs');
      this.renderCityBlocksView();
    });
  }

  async loadExistingRepos() {
    try {
      const repos = await getRepos();
      if (repos.length > 0) {
        this.repos = repos;
        this.ui.updateRepoList(repos);
        this.renderRepoView();
      }
    } catch (error) {
      console.log('No existing repos found');
    }
  }

  async analyzeLocal() {
    const path = this.ui.getLocalPath();
    if (!path) return;

    this.ui.showLoading(true);

    try {
      const analysis = await analyzeLocalRepo(path);
      this.addRepo(analysis);
      this.ui.clearLocalPath();
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      this.ui.showLoading(false);
    }
  }

  async analyzeGithub() {
    const repo = this.ui.getGithubRepo();
    if (!repo) return;

    this.ui.showLoading(true);

    try {
      const analysis = await analyzeGithubRepo(repo);
      this.addRepo(analysis);
      this.ui.clearGithubRepo();
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      this.ui.showLoading(false);
    }
  }

  addRepo(repo) {
    // Check if already exists
    const existingIndex = this.repos.findIndex((r) => r.id === repo.id);
    if (existingIndex >= 0) {
      this.repos[existingIndex] = repo;
    } else {
      this.repos.push(repo);
    }

    this.ui.updateRepoList(this.repos);
    this.renderRepoView();
  }

  renderRepoView() {
    this.scene.clearBuildings();

    if (this.repos.length === 0) return;

    const layout = layoutBuildings(this.repos);

    layout.forEach(({ data, position, dimensions, color }) => {
      this.scene.addBuilding(data, position, dimensions, color);
    });

    this.scene.focusOnBuildings();
  }

  renderCityBlocksView() {
    if (this.repos.length === 0) {
      return;
    }

    // Check if any repos have directories
    const reposWithDirs = this.repos.filter(
      (r) => r.directories && r.directories.length > 0
    );

    if (reposWithDirs.length === 0) {
      alert('No directory data available. Analyze some repositories first.');
      this.currentView = 'repos';
      this.ui.setView('repos');
      return;
    }

    this.ui.setView('dirs');
    this.scene.clearBuildings();

    // Layout all repos as city blocks
    const { buildings, blocks } = layoutCityBlocks(reposWithDirs);

    // Render city blocks (ground planes with labels)
    blocks.forEach((block) => {
      this.scene.addCityBlock(block);
    });

    // Render buildings (directories)
    buildings.forEach(({ data, position, dimensions, color }) => {
      this.scene.addBuilding(data, position, dimensions, color);
    });

    this.scene.focusOnBuildings();
  }

  highlightBuilding(id) {
    const building = this.scene.buildings.get(id);
    if (building) {
      // Reset all buildings
      this.scene.buildings.forEach((b) => {
        b.material.emissive.setHex(0x000000);
      });
      // Highlight selected
      building.material.emissive.setHex(0x333366);
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.codeCity = new CodeCity();
});
