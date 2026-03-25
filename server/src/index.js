const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config(); // loads variables from .env into process.env

const app = express();
const PORT = process.env.PORT || 3001;

// NODE_ENV is set to "production" on hosting platforms like Render.
// In development it's undefined, so isProd is false.
const isProd = process.env.NODE_ENV === 'production';

// CORS (Cross-Origin Resource Sharing) allows the browser to make requests
// to a different origin (domain/port) than the page it's on.
// In dev the frontend runs on :5173 and the server on :3001 — different ports
// means different origins, so we need CORS.
// In production they share the same origin (Express serves the built React app),
// so CORS is not needed.
if (!isProd) {
  app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true, // allows cookies/auth headers to be sent cross-origin
  }));
}

// Parse incoming JSON request bodies (e.g. { code: "...", language: "..." })
// limit: '10mb' prevents extremely large payloads from crashing the server
app.use(express.json({ limit: '10mb' }));

// Simple health check endpoint — useful for deployment platforms to verify
// the server is running, and for debugging.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount route handlers — each file handles one "resource" (noun in the URL).
// Express passes any request starting with these paths to the matching router.
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/github', require('./routes/github'));

// In production, serve the built React app (client/dist) as static files.
// express.static serves HTML, JS, CSS, images etc. from a folder.
// The catch-all route below it ensures React Router works — any URL that
// isn't an /api route returns index.html, and React handles the routing
// on the client side.
if (isProd) {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
