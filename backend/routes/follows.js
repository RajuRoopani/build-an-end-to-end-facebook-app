/**
 * routes/follows.js
 *
 * AC14  POST   /api/follow              — follow a user
 * AC15  DELETE /api/follow              — unfollow a user
 * AC16  GET    /api/users/:id/followers — (handled in users.js)
 * AC17  GET    /api/users/:id/following — (handled in users.js)
 *
 * Body for POST/DELETE:
 *   { followerId: string, followeeId: string }
 */

const router = require('express').Router();
const storage = require('../storage');

// ── POST /api/follow ──────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { followerId, followeeId } = req.body;

  if (!followerId || !followeeId) {
    return res.status(400).json({ error: 'followerId and followeeId are required' });
  }

  if (followerId === followeeId) {
    return res.status(400).json({ error: 'a user cannot follow themselves' });
  }

  if (!storage.users[followerId]) {
    return res.status(404).json({ error: 'follower user not found' });
  }

  if (!storage.users[followeeId]) {
    return res.status(404).json({ error: 'followee user not found' });
  }

  const alreadyFollowing = storage.follows.some(
    (f) => f.followerId === followerId && f.followeeId === followeeId
  );
  if (alreadyFollowing) {
    return res.status(400).json({ error: 'already following this user' });
  }

  storage.follows.push({ followerId, followeeId });
  return res.status(201).json({ followerId, followeeId });
});

// ── DELETE /api/follow ────────────────────────────────────────────────────────
router.delete('/', (req, res) => {
  const { followerId, followeeId } = req.body;

  if (!followerId || !followeeId) {
    return res.status(400).json({ error: 'followerId and followeeId are required' });
  }

  const index = storage.follows.findIndex(
    (f) => f.followerId === followerId && f.followeeId === followeeId
  );

  if (index === -1) {
    return res.status(404).json({ error: 'follow relationship not found' });
  }

  storage.follows.splice(index, 1);
  return res.status(200).json({ message: 'unfollowed successfully' });
});

module.exports = router;
