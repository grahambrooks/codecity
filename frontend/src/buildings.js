import { getLanguageColor } from './colors.js';

// Constants for scaling
const MIN_SIZE = 2;
const MAX_SIZE = 15;
const MIN_HEIGHT = 1;
const MAX_HEIGHT = 30;
const SPACING = 2;

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
    const x = (col - cols / 2) * (MAX_SIZE + SPACING);
    const z = (row - Math.ceil(count / cols) / 2) * (MAX_SIZE + SPACING);

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
