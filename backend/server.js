/**
 * server.js — Facebook App Entry Point
 *
 * - Express app with JSON + CORS middleware
 * - Serves frontend/ as static files
 * - Mounts all 6 API routers under /api/
 * - Seeds data on startup
 * - Exports `app` for testing; only starts HTTP server when run directly
 */

'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');

const { seed } = require('./seed');

// Route files
const usersRouter = require('./routes/users');
const postsRouter = require('./routes/posts');
const followsRouter = require('./routes/follows');
const likesRouter = require('./routes/likes');
const feedRouter = require('./routes/feed');
const { router: suggestionsRouter } = require('./routes/suggestions');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Static frontend ───────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/users', usersRouter);
app.use('/api/posts', postsRouter);
// Like/unlike actions: POST/DELETE /api/posts/:id/like
app.use('/api/posts/:id/like', likesRouter);
// List likers: GET /api/posts/:id/likes  (note plural — handled in postsRouter)
app.use('/api/follow', followsRouter);
app.use('/api/feed', feedRouter);
app.use('/api/suggestions', suggestionsRouter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// ── Error handler ─────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// ── Seed data + start server ──────────────────────────────────────────────────
if (require.main === module) {
  seed();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Facebook App API listening on http://localhost:${PORT}`);
    console.log(`Frontend served at http://localhost:${PORT}/`);
  });
}

module.exports = app;
