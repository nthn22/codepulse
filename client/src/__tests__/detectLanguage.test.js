import { detectLanguage } from '../utils/detectLanguage'

describe('detectLanguage', () => {
  it.each([
    ['index.js', 'javascript'],
    ['App.jsx', 'javascript'],
    ['main.ts', 'typescript'],
    ['Component.tsx', 'typescript'],
    ['script.py', 'python'],
    ['Main.java', 'java'],
    ['main.go', 'go'],
    ['lib.rs', 'rust'],
    ['app.rb', 'ruby'],
    ['index.php', 'php'],
    ['styles.css', 'css'],
    ['index.html', 'html'],
    ['page.htm', 'html'],
    ['query.sql', 'sql'],
    ['main.c', 'c'],
    ['main.cpp', 'cpp'],
    ['App.cs', 'csharp'],
    ['app.swift', 'swift'],
    ['App.kt', 'kotlin'],
  ])('%s → %s', (filename, expected) => {
    expect(detectLanguage(filename)).toBe(expected)
  })

  it('defaults to javascript for unknown extensions', () => {
    expect(detectLanguage('README.md')).toBe('javascript')
    expect(detectLanguage('Makefile')).toBe('javascript')
    expect(detectLanguage('file.xyz')).toBe('javascript')
  })

  it('is case-insensitive for extensions', () => {
    expect(detectLanguage('script.PY')).toBe('python')
    expect(detectLanguage('app.TS')).toBe('typescript')
  })
})
