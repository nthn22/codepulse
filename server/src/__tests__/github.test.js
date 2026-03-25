const { toRawUrl } = require('../utils/github');

describe('toRawUrl', () => {
  it('converts a github.com blob URL to a raw URL', () => {
    const input = 'https://github.com/expressjs/express/blob/master/lib/router/index.js';
    const expected = 'https://raw.githubusercontent.com/expressjs/express/master/lib/router/index.js';
    expect(toRawUrl(input)).toBe(expected);
  });

  it('handles nested file paths', () => {
    const input = 'https://github.com/user/repo/blob/main/src/utils/helper.ts';
    const expected = 'https://raw.githubusercontent.com/user/repo/main/src/utils/helper.ts';
    expect(toRawUrl(input)).toBe(expected);
  });

  it('passes through an already-raw URL unchanged', () => {
    const raw = 'https://raw.githubusercontent.com/user/repo/main/file.js';
    expect(toRawUrl(raw)).toBe(raw);
  });

  it('returns null for a github.com repo URL without /blob/', () => {
    expect(toRawUrl('https://github.com/user/repo')).toBeNull();
  });

  it('returns null for a non-github URL', () => {
    expect(toRawUrl('https://gitlab.com/user/repo/blob/main/file.js')).toBeNull();
  });

  it('returns null for an invalid URL', () => {
    expect(toRawUrl('not-a-url')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(toRawUrl('')).toBeNull();
  });
});
