const EXTENSION_LANGUAGE_MAP = {
  java: 'Java',
  js: 'JavaScript',
  jsx: 'React JSX',
  ts: 'TypeScript',
  tsx: 'React TSX',
  py: 'Python',
  cs: 'C#',
  cpp: 'C++',
  c: 'C',
  php: 'PHP',
  kt: 'Kotlin',
  go: 'Go',
  rs: 'Rust',
  sql: 'SQL',
  md: 'Markdown',
  json: 'JSON',
  yml: 'YAML',
  yaml: 'YAML',
  xml: 'XML',
  html: 'HTML',
  htm: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  less: 'Less',
  sh: 'Shell',
  bash: 'Shell',
  ps1: 'PowerShell',
  dockerfile: 'Dockerfile',
  ini: 'INI',
  txt: 'Text'
};

export function detectLanguage(extension) {
  if (!extension || typeof extension !== 'string') {
    return 'Unknown';
  }

  const normalized = extension.toLowerCase().replace(/^[.]/, '');
  if (!normalized) {
    return 'Unknown';
  }

  return EXTENSION_LANGUAGE_MAP[normalized] || 'Unknown';
}
