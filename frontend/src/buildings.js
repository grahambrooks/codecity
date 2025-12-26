import { getLanguageColor } from './colors.js';

// Constants for scaling - compact for city blocks view
const MIN_SIZE = 1.5;
const MAX_SIZE = 6;
const MIN_HEIGHT = 0.5;
const MAX_HEIGHT = 20;
const BUILDING_SPACING = 0.8;
const BLOCK_SPACING = 3;  // Space between city blocks
const BLOCK_PADDING = 1;  // Padding within a block

// Larger sizes for repo-only view
const REPO_MIN_SIZE = 2;
const REPO_MAX_SIZE = 15;
const REPO_MIN_HEIGHT = 1;
const REPO_MAX_HEIGHT = 30;
const REPO_SPACING = 2;

export function calculateBuildingDimensions(data, allData, compact = true) {
  // Find max values for normalization
  const maxLines = Math.max(...allData.map(d => d.total_lines || d.lines || 1));
  const maxAge = Math.max(...allData.map(d => d.age_days || 1));

  const lines = data.total_lines || data.lines || 0;
  const age = data.age_days || 0;

  // Use different scales for compact (city blocks) vs full (repo) view
  const minSize = compact ? MIN_SIZE : REPO_MIN_SIZE;
  const maxSize = compact ? MAX_SIZE : REPO_MAX_SIZE;
  const minHeight = compact ? MIN_HEIGHT : REPO_MIN_HEIGHT;
  const maxHeight = compact ? MAX_HEIGHT : REPO_MAX_HEIGHT;

  // Volume (width * depth) scales with lines of code
  // Use square root for more reasonable sizing
  const normalizedLines = Math.sqrt(lines) / Math.sqrt(maxLines);
  const baseSize = minSize + normalizedLines * (maxSize - minSize);

  // Height scales with age
  const normalizedAge = age / maxAge;
  const height = minHeight + normalizedAge * (maxHeight - minHeight);

  return {
    width: Math.max(minSize, baseSize),
    depth: Math.max(minSize, baseSize),
    height: Math.max(minHeight, height),
  };
}

export function getPrimaryLanguageColor(data) {
  if (data.languages && data.languages.length > 0) {
    return data.languages[0].color || getLanguageColor(data.languages[0].language);
  }
  return '#8B8B8B';
}

export function layoutBuildings(items) {
  const positions = [];
  const sortedItems = [...items].sort((a, b) =>
    (b.total_lines || b.lines || 0) - (a.total_lines || a.lines || 0)
  );

  // Calculate grid layout
  const count = sortedItems.length;
  const cols = Math.ceil(Math.sqrt(count));

  sortedItems.forEach((item, index) => {
    const dimensions = calculateBuildingDimensions(item, items, false); // Use larger repo sizes
    const row = Math.floor(index / cols);
    const col = index % cols;

    // Calculate position with spacing (use repo spacing)
    const x = (col - cols / 2) * (REPO_MAX_SIZE + REPO_SPACING);
    const z = (row - Math.ceil(count / cols) / 2) * (REPO_MAX_SIZE + REPO_SPACING);

    positions.push({
      data: item,
      position: { x, z },
      dimensions,
      color: getPrimaryLanguageColor(item),
    });
  });

  return positions;
}

export function layoutDirectories(directories, parentData) {
  // Flatten first level of directories for visualization
  const items = directories.filter(d => d.lines > 0);
  return layoutBuildings(items);
}

// Layout all repositories as city blocks, each containing directory buildings
export function layoutCityBlocks(repos) {
  const result = {
    buildings: [],
    blocks: [],
  };

  if (repos.length === 0) return result;

  // Collect all directories across all repos for normalization
  const allDirs = [];
  repos.forEach(repo => {
    if (repo.directories) {
      repo.directories.filter(d => d.lines > 0).forEach(dir => {
        allDirs.push({ ...dir, repoId: repo.id, repoName: repo.name });
      });
    }
  });

  // Sort repos by total lines for better layout (largest first)
  const sortedRepos = [...repos].sort((a, b) => b.total_lines - a.total_lines);

  // Calculate block sizes first
  const blockInfos = sortedRepos.map((repo) => {
    const dirs = (repo.directories || []).filter(d => d.lines > 0);
    const dirCount = Math.max(dirs.length, 1);

    // Limit directories shown per block for compactness
    const maxDirsShown = Math.min(dirCount, 16);
    const dirCols = Math.ceil(Math.sqrt(maxDirsShown));
    const dirRows = Math.ceil(maxDirsShown / dirCols);

    // Compact block size
    const blockWidth = dirCols * (MAX_SIZE + BUILDING_SPACING) + BLOCK_PADDING * 2;
    const blockDepth = dirRows * (MAX_SIZE + BUILDING_SPACING) + BLOCK_PADDING * 2;

    return {
      repo,
      dirs: dirs.slice(0, maxDirsShown), // Limit directories
      allDirsCount: dirCount,
      dirCols,
      dirRows,
      blockWidth,
      blockDepth,
    };
  });

  // Use row-based packing: fill rows left-to-right, wrap when needed
  // Calculate target row width based on number of repos
  const totalWidth = blockInfos.reduce((sum, b) => sum + b.blockWidth, 0);
  const avgBlockWidth = totalWidth / blockInfos.length;
  const targetCols = Math.ceil(Math.sqrt(repos.length * 1.5)); // Slightly wider than square
  const targetRowWidth = targetCols * (avgBlockWidth + BLOCK_SPACING);

  // Pack blocks into rows
  const rows = [];
  let currentRow = [];
  let currentRowWidth = 0;

  blockInfos.forEach((blockInfo) => {
    const blockTotalWidth = blockInfo.blockWidth + BLOCK_SPACING;

    if (currentRowWidth + blockTotalWidth > targetRowWidth && currentRow.length > 0) {
      rows.push(currentRow);
      currentRow = [];
      currentRowWidth = 0;
    }

    currentRow.push(blockInfo);
    currentRowWidth += blockTotalWidth;
  });

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  // Calculate total dimensions for centering
  const rowHeights = rows.map(row => Math.max(...row.map(b => b.blockDepth)));
  const totalDepth = rowHeights.reduce((sum, h) => sum + h + BLOCK_SPACING, 0);
  const maxRowWidth = Math.max(...rows.map(row =>
    row.reduce((sum, b) => sum + b.blockWidth + BLOCK_SPACING, 0)
  ));

  // Position blocks
  let currentZ = -totalDepth / 2;

  rows.forEach((row, rowIndex) => {
    const rowHeight = rowHeights[rowIndex];
    const rowWidth = row.reduce((sum, b) => sum + b.blockWidth + BLOCK_SPACING, 0);
    let currentX = -rowWidth / 2;

    row.forEach((blockInfo, blockIndex) => {
      const { repo, dirs, dirCols, blockWidth, blockDepth } = blockInfo;

      // Block center position
      const blockX = currentX + blockWidth / 2;
      const blockZ = currentZ + rowHeight / 2;

      // Add block info for ground plane rendering
      result.blocks.push({
        repoId: repo.id,
        repoName: repo.name,
        position: { x: blockX, z: blockZ },
        width: blockWidth,
        depth: blockDepth,
        color: getPrimaryLanguageColor(repo),
      });

      // Position buildings within block
      dirs.forEach((dir, dirIndex) => {
        const dirRow = Math.floor(dirIndex / dirCols);
        const dirCol = dirIndex % dirCols;

        // Extend dir data with repo info
        const extendedDir = {
          ...dir,
          repoId: repo.id,
          repoName: repo.name,
        };

        const dimensions = calculateBuildingDimensions(extendedDir, allDirs, true);

        // Position relative to block center
        const localX = (dirCol - dirCols / 2 + 0.5) * (MAX_SIZE + BUILDING_SPACING);
        const localZ = (dirRow - Math.ceil(dirs.length / dirCols) / 2 + 0.5) * (MAX_SIZE + BUILDING_SPACING);

        result.buildings.push({
          data: extendedDir,
          position: { x: blockX + localX, z: blockZ + localZ },
          dimensions,
          color: getPrimaryLanguageColor(dir),
          blockIndex: rowIndex * 100 + blockIndex,
        });
      });

      currentX += blockWidth + BLOCK_SPACING;
    });

    currentZ += rowHeight + BLOCK_SPACING;
  });

  return result;
}

export function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function formatAge(days) {
  if (days >= 365) {
    const years = Math.floor(days / 365);
    return `${years} year${years > 1 ? 's' : ''}`;
  }
  if (days >= 30) {
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? 's' : ''}`;
  }
  return `${days} day${days !== 1 ? 's' : ''}`;
}
