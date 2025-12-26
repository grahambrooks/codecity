import { formatNumber, formatAge } from './buildings.js';
import { LANGUAGE_COLORS } from './colors.js';

export class UI {
  constructor() {
    this.elements = {
      localPath: document.getElementById('local-path'),
      analyzeLocal: document.getElementById('analyze-local'),
      githubRepo: document.getElementById('github-repo'),
      analyzeGithub: document.getElementById('analyze-github'),
      viewRepos: document.getElementById('view-repos'),
      viewDirs: document.getElementById('view-dirs'),
      repoList: document.getElementById('repo-list'),
      legendItems: document.getElementById('legend-items'),
      tooltip: document.getElementById('tooltip'),
      tooltipName: document.getElementById('tooltip-name'),
      tooltipLines: document.getElementById('tooltip-lines'),
      tooltipAge: document.getElementById('tooltip-age'),
      tooltipLanguage: document.getElementById('tooltip-language'),
      loading: document.getElementById('loading'),
      breadcrumb: document.getElementById('breadcrumb'),
      breadcrumbRoot: document.getElementById('breadcrumb-root'),
      breadcrumbCurrent: document.getElementById('breadcrumb-current'),
    };

    this.repos = [];
    this.currentView = 'repos';
    this.selectedRepo = null;

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.elements.viewRepos.addEventListener('click', () => {
      this.setView('repos');
    });

    this.elements.viewDirs.addEventListener('click', () => {
      this.setView('dirs');
    });

    this.elements.breadcrumbRoot.addEventListener('click', () => {
      this.selectedRepo = null;
      this.setView('repos');
      if (this.onViewChange) {
        this.onViewChange('repos', null);
      }
    });
  }

  setView(view) {
    this.currentView = view;
    this.elements.viewRepos.classList.toggle('active', view === 'repos');
    this.elements.viewDirs.classList.toggle('active', view === 'dirs');

    if (view === 'repos') {
      this.elements.breadcrumb.classList.remove('visible');
    }
  }

  showLoading(show) {
    this.elements.loading.classList.toggle('visible', show);
    this.elements.analyzeLocal.disabled = show;
    this.elements.analyzeGithub.disabled = show;
  }

  showTooltip(data, x, y) {
    if (!data) {
      this.elements.tooltip.classList.remove('visible');
      return;
    }

    this.elements.tooltipName.textContent = data.name;
    this.elements.tooltipLines.textContent = formatNumber(data.total_lines || data.lines || 0);
    this.elements.tooltipAge.textContent = formatAge(data.age_days || 0);
    this.elements.tooltipLanguage.textContent =
      data.languages && data.languages.length > 0
        ? data.languages[0].language
        : 'Unknown';

    // Position tooltip
    const tooltip = this.elements.tooltip;
    tooltip.style.left = `${x + 15}px`;
    tooltip.style.top = `${y + 15}px`;

    // Keep tooltip in viewport
    const rect = tooltip.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      tooltip.style.left = `${x - rect.width - 15}px`;
    }
    if (rect.bottom > window.innerHeight) {
      tooltip.style.top = `${y - rect.height - 15}px`;
    }

    tooltip.classList.add('visible');
  }

  updateRepoList(repos) {
    this.repos = repos;
    this.elements.repoList.innerHTML = '';

    repos.forEach((repo) => {
      const item = document.createElement('div');
      item.className = 'repo-item';
      item.dataset.id = repo.id;

      const languageBar = this.createLanguageBar(repo.languages);

      item.innerHTML = `
        <div class="repo-item-name">${repo.name}</div>
        <div class="repo-item-stats">
          ${formatNumber(repo.total_lines)} lines | ${formatAge(repo.age_days)} old
        </div>
        ${languageBar}
      `;

      item.addEventListener('click', () => {
        document.querySelectorAll('.repo-item').forEach((el) => {
          el.classList.remove('selected');
        });
        item.classList.add('selected');
        this.selectedRepo = repo;

        if (this.currentView === 'dirs') {
          this.elements.breadcrumb.classList.add('visible');
          this.elements.breadcrumbCurrent.textContent = repo.name;
        }

        if (this.onRepoSelect) {
          this.onRepoSelect(repo);
        }
      });

      this.elements.repoList.appendChild(item);
    });

    this.updateLegend(repos);
  }

  createLanguageBar(languages) {
    if (!languages || languages.length === 0) {
      return '<div class="language-bar"><div class="language-segment" style="width: 100%; background: #8B8B8B"></div></div>';
    }

    const segments = languages
      .slice(0, 5)
      .map(
        (lang) =>
          `<div class="language-segment" style="width: ${lang.percentage}%; background: ${lang.color}"></div>`
      )
      .join('');

    return `<div class="language-bar">${segments}</div>`;
  }

  updateLegend(repos) {
    // Collect all unique languages
    const languageSet = new Set();
    repos.forEach((repo) => {
      if (repo.languages) {
        repo.languages.forEach((lang) => {
          languageSet.add(lang.language);
        });
      }
    });

    this.elements.legendItems.innerHTML = '';

    // Sort by common usage
    const sortedLanguages = Array.from(languageSet).sort();

    sortedLanguages.forEach((language) => {
      const color = LANGUAGE_COLORS[language] || '#8B8B8B';
      const item = document.createElement('div');
      item.className = 'legend-item';
      item.innerHTML = `
        <div class="legend-color" style="background: ${color}"></div>
        <span>${language}</span>
      `;
      this.elements.legendItems.appendChild(item);
    });
  }

  getLocalPath() {
    return this.elements.localPath.value.trim();
  }

  getGithubRepo() {
    return this.elements.githubRepo.value.trim();
  }

  clearLocalPath() {
    this.elements.localPath.value = '';
  }

  clearGithubRepo() {
    this.elements.githubRepo.value = '';
  }
}
