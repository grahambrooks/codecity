// Language colors matching backend
export const LANGUAGE_COLORS = {
  'Rust': '#DEA584',
  'JavaScript': '#F7DF1E',
  'TypeScript': '#3178C6',
  'Python': '#3776AB',
  'Go': '#00ADD8',
  'Java': '#B07219',
  'C++': '#F34B7D',
  'C': '#555555',
  'Ruby': '#CC342D',
  'HTML': '#E34C26',
  'CSS': '#563D7C',
  'SCSS': '#C6538C',
  'Sass': '#C6538C',
  'JSON': '#292929',
  'YAML': '#CB171E',
  'Markdown': '#083FA1',
  'Shell': '#89E051',
  'PHP': '#4F5D95',
  'Swift': '#F05138',
  'Kotlin': '#A97BFF',
  'Scala': '#DC322F',
  'Haskell': '#5E5086',
  'Elixir': '#6E4A7E',
  'Clojure': '#DB5855',
  'Lua': '#000080',
  'R': '#198CE7',
  'Dart': '#00B4AB',
  'Vue': '#41B883',
  'Svelte': '#FF3E00',
  'SQL': '#E38C00',
  'GraphQL': '#E10098',
  'TOML': '#9C4221',
  'XML': '#0060AC',
};

export function getLanguageColor(language) {
  return LANGUAGE_COLORS[language] || '#8B8B8B';
}

export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 139, g: 139, b: 139 };
}
