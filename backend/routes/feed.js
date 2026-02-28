/**
 * routes/feed.js
 *
 * AC21  GET /api/feed/:userId — returns posts from users that userId follows,
 *                               sorted newest first. Does NOT include the
 *                               user's own posts.
 * AC22  404 if userId not found.
 */

const router = require('express').Router();
const storage = require('../storage');

// ── GET /api/feed/:userId ─────────────────────────────────────────────────────
router.get('/:userId', (req, res) => {
  const { userId } = req.params;

  if (!storage.users[userId]) {
    return res.status(404).json({ error: 'user not found' });
  }

  // Collect IDs of users that this user follows
  const followingIds = new Set(
    storage.follows
      .filter((f) => f.followerId === userId)
      .map((f) => f.followeeId)
  );

  // Posts authored by followed users, sorted newest first
  const feedPosts = Object.values(storage.posts)
    .filter((p) => followingIds.has(p.authorId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((p) => ({
      ...p,
      author: storage.users[p.authorId] || null,
    }));

  return res.status(200).json(feedPosts);
});

module.exports = router;
