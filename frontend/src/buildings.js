import { getLanguageColor } from './colors.js';

// Constants for scaling
const MIN_SIZE = 2;
const MAX_SIZE = 12;
const MIN_HEIGHT = 1;
const MAX_HEIGHT = 30;
const BUILDING_SPACING = 1.5;
const BLOCK_SPACING = 8;  // Space between city blocks
const BLOCK_PADDING = 2;  // Padding within a block

export function calculateBuildingDimensions(data, allData) {
  // Find max values for normalization
  const maxLines = Math.max(...allData.map(d => d.total_lines || d.lines || 1));
  const maxAge = Math.max(...allData.map(d => d.age_days || 1));

  const lines = data.total_lines || data.lines || 0;
  const age = data.age_days || 0;

  // Volume (width * depth) scales with lines of code
  // Use square root for more reasonable sizing
  const normalizedLines = Math.sqrt(lines) / Math.sqrt(maxLines);
  const baseSize = MIN_SIZE + normalizedLines * (MAX_SIZE - MIN_SIZE);

  // Height scales with age
  const normalizedAge = age / maxAge;
  const height = MIN_HEIGHT + normalizedAge * (MAX_HEIGHT - MIN_HEIGHT);

  return {
    width: Math.max(MIN_SIZE, baseSize),
    depth: Math.max(MIN_SIZE, baseSize),
    height: Math.max(MIN_HEIGHT, height),
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
    const dimensions = calculateBuildingDimensions(item, items);
    const row = Math.floor(index / cols);
    const col = index % cols;

    // Calculate position with spacing
    const x = (col - cols / 2) * (MAX_SIZE + BUILDING_SPACING);
    const z = (row - Math.ceil(count / cols) / 2) * (MAX_SIZE + BUILDING_SPACING);

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

  // Sort repos by total lines for better layout
  const sortedRepos = [...repos].sort((a, b) => b.total_lines - a.total_lines);

  // Calculate grid for blocks
  const blockCount = sortedRepos.length;
  const blockCols = Math.ceil(Math.sqrt(blockCount));

  // First pass: calculate block sizes
  const blockInfos = sortedRepos.map((repo, index) => {
    const dirs = (repo.directories || []).filter(d => d.lines > 0);
    const dirCount = Math.max(dirs.length, 1);
    const dirCols = Math.ceil(Math.sqrt(dirCount));
    const dirRows = Math.ceil(dirCount / dirCols);

    // Block size based on number of directories
    const blockWidth = dirCols * (MAX_SIZE + BUILDING_SPACING) + BLOCK_PADDING * 2;
    const blockDepth = dirRows * (MAX_SIZE + BUILDING_SPACING) + BLOCK_PADDING * 2;

    return {
      repo,
      dirs,
      dirCols,
      dirRows,
      blockWidth,
      blockDepth,
      blockRow: Math.floor(index / blockCols),
      blockCol: index % blockCols,
    };
  });

  // Calculate max block dimensions per row/col for alignment
  const maxBlockWidth = Math.max(...blockInfos.map(b => b.blockWidth));
  const maxBlockDepth = Math.max(...blockInfos.map(b => b.blockDepth));

  // Second pass: position blocks and buildings
  blockInfos.forEach((blockInfo, blockIndex) => {
    const { repo, dirs, dirCols, blockRow, blockCol, blockWidth, blockDepth } = blockInfo;

    // Block center position
    const blockX = (blockCol - blockCols / 2 + 0.5) * (maxBlockWidth + BLOCK_SPACING);
    const blockZ = (blockRow - Math.ceil(blockCount / blockCols) / 2 + 0.5) * (maxBlockDepth + BLOCK_SPACING);

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

      const dimensions = calculateBuildingDimensions(extendedDir, allDirs);

      // Position relative to block center
      const localX = (dirCol - dirCols / 2 + 0.5) * (MAX_SIZE + BUILDING_SPACING);
      const localZ = (dirRow - Math.ceil(dirs.length / dirCols) / 2 + 0.5) * (MAX_SIZE + BUILDING_SPACING);

      result.buildings.push({
        data: extendedDir,
        position: { x: blockX + localX, z: blockZ + localZ },
        dimensions,
        color: getPrimaryLanguageColor(dir),
        blockIndex,
      });
    });
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
