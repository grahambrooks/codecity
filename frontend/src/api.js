const API_BASE = '/api';

export async function analyzeLocalRepo(path) {
  const response = await fetch(`${API_BASE}/analyze/local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to analyze repository');
  }

  return response.json();
}

export async function analyzeGithubRepo(ownerRepo) {
  const [owner, repo] = ownerRepo.split('/');
  if (!owner || !repo) {
    throw new Error('Invalid format. Use: owner/repository');
  }

  const response = await fetch(`${API_BASE}/analyze/github`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ owner, repo }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to analyze repository');
  }

  return response.json();
}

export async function getRepos() {
  const response = await fetch(`${API_BASE}/repos`);
  if (!response.ok) {
    throw new Error('Failed to fetch repositories');
  }
  return response.json();
}

export async function getRepoTree(id) {
  const response = await fetch(`${API_BASE}/repo/${id}/tree`);
  if (!response.ok) {
    throw new Error('Failed to fetch repository tree');
  }
  return response.json();
}

export async function scanDirectory(path) {
  const response = await fetch(`${API_BASE}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to scan directory');
  }

  return response.json();
}
