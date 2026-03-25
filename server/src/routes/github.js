const express = require('express');
const router = express.Router();
const { toRawUrl } = require('../utils/github');

// GET /api/github/file?url=<github_url>
// Fetches a file from GitHub and returns its content.
//
// Why proxy through the server instead of fetching from the browser directly?
// While raw.githubusercontent.com allows CORS, routing through our server gives us:
//  1. A consistent place to enforce size limits
//  2. A single point to add GitHub auth tokens in the future (for private repos)
//  3. Better error messages (we can translate GitHub's status codes)
router.get('/file', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'url query parameter is required' });
  }

  // Convert a regular GitHub URL to the raw content URL.
  // e.g. github.com/user/repo/blob/main/file.js → raw.githubusercontent.com/...
  const rawUrl = toRawUrl(url);
  if (!rawUrl) {
    return res.status(400).json({ error: 'Invalid or unsupported GitHub URL' });
  }

  // Fetch the raw file content from GitHub.
  // The User-Agent header is required by GitHub's API — requests without it get blocked.
  const response = await fetch(rawUrl, {
    headers: { 'User-Agent': 'CodePulse/1.0' },
  });

  if (response.status === 404) {
    return res.status(404).json({ error: 'File not found. Make sure the repository is public.' });
  }

  if (!response.ok) {
    return res.status(response.status).json({ error: 'Failed to fetch file from GitHub' });
  }

  const content = await response.text();

  // Reject files that are too large to review meaningfully.
  // Sending 500KB+ to an LLM would be slow, expensive, and hit token limits.
  if (content.length > 500_000) {
    return res.status(413).json({ error: 'File is too large to review (max 500KB)' });
  }

  // Return the content, the filename (so the client can auto-detect the language),
  // and the raw URL for reference.
  const filename = rawUrl.split('/').pop();
  res.json({ content, filename, rawUrl });
});

module.exports = router;
