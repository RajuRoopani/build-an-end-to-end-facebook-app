/**
 * routes/posts.js
 *
 * AC9   POST /api/posts          — create post (authorId must exist)
 * AC10  GET  /api/posts          — list all posts, newest first
 * AC11  GET  /api/posts/:id      — get single post with author info + likesCount
 * AC12  DELETE /api/posts/:id   — delete post; 404 if not found
 * AC13  (GET /api/users/:userId/posts is handled in users.js to avoid mount conflicts)
 */

const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const storage = require('../storage');

// ── POST /api/posts ───────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { authorId, content, mediaType, mediaUrl } = req.body;

  if (!authorId || !storage.users[authorId]) {
    return res.status(400).json({ error: 'authorId is missing or does not refer to a valid user' });
  }

  if (!content || typeof content !== 'string' || content.trim() === '') {
    return res.status(400).json({ error: 'content is required' });
  }

  // Validate mediaType if provided
  const validMediaTypes = ['image', 'video', null, undefined];
  if (mediaType !== undefined && mediaType !== null && !['image', 'video'].includes(mediaType)) {
    return res.status(400).json({ error: 'mediaType must be "image", "video", or null' });
  }

  const post = {
    id: uuidv4(),
    authorId,
    content: content.trim(),
    mediaType: mediaType || null,
    mediaUrl: mediaUrl || null,
    createdAt: new Date().toISOString(),
    likesCount: 0,
  };

  storage.posts[post.id] = post;
  return res.status(201).json(post);
});

// ── GET /api/posts ────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const posts = Object.values(storage.posts).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  return res.status(200).json(posts);
});

// ── GET /api/posts/:id ────────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const post = storage.posts[req.params.id];
  if (!post) return res.status(404).json({ error: 'post not found' });

  const author = storage.users[post.authorId] || null;
  return res.status(200).json({ ...post, author });
});

// ── DELETE /api/posts/:id ─────────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const post = storage.posts[req.params.id];
  if (!post) return res.status(404).json({ error: 'post not found' });

  // Clean up associated likes
  storage.likes = storage.likes.filter((l) => l.postId !== req.params.id);

  delete storage.posts[req.params.id];
  return res.status(204).send();
});

// ── GET /api/posts/:id/likes ──────────────────────────────────────────────────
// Returns array of user objects who liked the post (AC20 — list side).
// The like/unlike mutation routes live in routes/likes.js (mounted at /api/posts/:id/like).
router.get('/:id/likes', (req, res) => {
  const post = storage.posts[req.params.id];
  if (!post) return res.status(404).json({ error: 'post not found' });

  const likers = storage.likes
    .filter((l) => l.postId === req.params.id)
    .map((l) => storage.users[l.userId])
    .filter(Boolean);

  return res.status(200).json(likers);
});

module.exports = router;
