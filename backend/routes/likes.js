/**
 * routes/likes.js
 *
 * AC18  POST   /api/posts/:id/like  — like a post
 * AC19  DELETE /api/posts/:id/like  — unlike a post
 * AC20  GET    /api/posts/:id/likes — get list of users who liked a post
 *
 * Body for POST/DELETE:
 *   { userId: string }
 */

const router = require('express').Router({ mergeParams: true });
const storage = require('../storage');

// ── POST /api/posts/:id/like ──────────────────────────────────────────────────
router.post('/', (req, res) => {
  const postId = req.params.id;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const post = storage.posts[postId];
  if (!post) return res.status(404).json({ error: 'post not found' });

  if (!storage.users[userId]) {
    return res.status(404).json({ error: 'user not found' });
  }

  const alreadyLiked = storage.likes.some(
    (l) => l.userId === userId && l.postId === postId
  );
  if (alreadyLiked) {
    return res.status(400).json({ error: 'post already liked by this user' });
  }

  storage.likes.push({ userId, postId });
  post.likesCount += 1;

  return res.status(201).json({ userId, postId, likesCount: post.likesCount });
});

// ── DELETE /api/posts/:id/like ────────────────────────────────────────────────
router.delete('/', (req, res) => {
  const postId = req.params.id;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const post = storage.posts[postId];
  if (!post) return res.status(404).json({ error: 'post not found' });

  const index = storage.likes.findIndex(
    (l) => l.userId === userId && l.postId === postId
  );

  if (index === -1) {
    return res.status(404).json({ error: 'like not found' });
  }

  storage.likes.splice(index, 1);
  post.likesCount = Math.max(0, post.likesCount - 1);

  return res.status(200).json({ message: 'unliked successfully', likesCount: post.likesCount });
});

// ── GET /api/posts/:id/likes ──────────────────────────────────────────────────
router.get('/', (req, res) => {
  const postId = req.params.id;

  if (!storage.posts[postId]) {
    return res.status(404).json({ error: 'post not found' });
  }

  const likers = storage.likes
    .filter((l) => l.postId === postId)
    .map((l) => storage.users[l.userId])
    .filter(Boolean);

  return res.status(200).json(likers);
});

module.exports = router;
