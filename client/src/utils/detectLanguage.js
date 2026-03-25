// Maps file extensions to Monaco Editor language identifiers.
// Monaco uses these to enable the right syntax highlighting and IntelliSense.
const EXT_TO_LANG = {
  js: 'javascript', jsx: 'javascript',
  ts: 'typescript', tsx: 'typescript',
  py: 'python',
  java: 'java',
  c: 'c',
  cpp: 'cpp', cc: 'cpp', cxx: 'cpp',
  cs: 'csharp',
  go: 'go',
  rs: 'rust',
  rb: 'ruby',
  php: 'php',
  swift: 'swift',
  kt: 'kotlin',
  html: 'html', htm: 'html',
  css: 'css',
  sql: 'sql',
}

// Extracts the file extension and returns the matching Monaco language ID.
// Falls back to 'javascript' for unknown extensions so the editor always
// has a valid language set.
export function detectLanguage(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  return EXT_TO_LANG[ext] || 'javascript'
}
