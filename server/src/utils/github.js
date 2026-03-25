// Converts a regular GitHub file URL to the "raw" content URL that returns
// plain text instead of the GitHub webpage.
//
// Example:
//   Input:  https://github.com/expressjs/express/blob/master/index.js
//   Output: https://raw.githubusercontent.com/expressjs/express/master/index.js
//
// The pattern for GitHub blob URLs is:
//   github.com / <user> / <repo> / blob / <branch> / <...path>
// The raw URL replaces the hostname and drops "blob":
//   raw.githubusercontent.com / <user> / <repo> / <branch> / <...path>
function toRawUrl(url) {
  try {
    const parsed = new URL(url);

    // Already pointing to the raw content CDN — use as-is
    if (parsed.hostname === 'raw.githubusercontent.com') {
      return url;
    }

    if (parsed.hostname === 'github.com') {
      // pathname looks like: /expressjs/express/blob/master/index.js
      // filter(Boolean) removes the empty string caused by the leading slash
      const parts = parsed.pathname.split('/').filter(Boolean);
      // parts: ['expressjs', 'express', 'blob', 'master', 'index.js']
      //         [0]          [1]         [2]    [3]        [4+]

      if (parts.length >= 5 && parts[2] === 'blob') {
        const [user, repo, , branch, ...filePath] = parts;
        return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${filePath.join('/')}`;
      }
    }

    return null; // URL is valid but not a supported GitHub file URL
  } catch {
    return null; // new URL() threw — the input wasn't a valid URL at all
  }
}

module.exports = { toRawUrl };
