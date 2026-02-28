/**
 * routes/users.js
 *
 * AC6  POST /api/users          — create user (unique username required)
 * AC7  GET  /api/users/:id      — get user profile with computed counts
 * AC8  GET  /api/users          — list all users
 *
 * Also houses the sub-routes that live on the /users/:id path
 * but belong logically to other domains:
 *   GET /api/users/:userId/posts       (returns user's posts, newest first)
 *   GET /api/users/:id/followers       (returns follower user objects)
 *   GET /api/users/:id/following       (returns followee user objects)
 *   GET /api/users/:id/suggestions     (friend-of-friend suggestions)
 */

const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const storage = require('../storage');

// ── POST /api/users ──────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { username, displayName, bio, profilePicUrl } = req.body;

  if (!username || typeof username !== 'string' || username.trim() === '') {
    return res.status(400).json({ error: 'username is required' });
  }

  if (!displayName || typeof displayName !== 'string' || displayName.trim() === '') {
    return res.status(400).json({ error: 'displayName is required' });
  }

  // Enforce unique username (case-insensitive)
  const nameLower = username.trim().toLowerCase();
  const exists = Object.values(storage.users).some(
    (u) => u.username.toLowerCase() === nameLower
  );
  if (exists) {
    return res.status(400).json({ error: 'username already taken' });
  }

  const user = {
    id: uuidv4(),
    username: username.trim(),
    displayName: displayName.trim(),
    bio: bio ? bio.trim() : '',
    profilePicUrl: profilePicUrl || null,
    createdAt: new Date().toISOString(),
  };

  storage.users[user.id] = user;
  return res.status(201).json(user);
});

// ── GET /api/users ───────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const users = Object.values(storage.users);
  return res.status(200).json(users);
});

// ── GET /api/users/:id ───────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const user = storage.users[req.params.id];
  if (!user) return res.status(404).json({ error: 'user not found' });

  const followerCount = storage.follows.filter(
    (f) => f.followeeId === req.params.id
  ).length;
  const followingCount = storage.follows.filter(
    (f) => f.followerId === req.params.id
  ).length;
  const postCount = Object.values(storage.posts).filter(
    (p) => p.authorId === req.params.id
  ).length;

  return res.status(200).json({ ...user, followerCount, followingCount, postCount });
});

// ── GET /api/users/:userId/posts ─────────────────────────────────────────────
router.get('/:userId/posts', (req, res) => {
  const user = storage.users[req.params.userId];
  if (!user) return res.status(404).json({ error: 'user not found' });

  const posts = Object.values(storage.posts)
    .filter((p) => p.authorId === req.params.userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.status(200).json(posts);
});

// ── GET /api/users/:id/followers ─────────────────────────────────────────────
router.get('/:id/followers', (req, res) => {
  if (!storage.users[req.params.id]) {
    return res.status(404).json({ error: 'user not found' });
  }

  const followers = storage.follows
    .filter((f) => f.followeeId === req.params.id)
    .map((f) => storage.users[f.followerId])
    .filter(Boolean); // guard against stale IDs

  return res.status(200).json(followers);
});

// ── GET /api/users/:id/following ─────────────────────────────────────────────
router.get('/:id/following', (req, res) => {
  if (!storage.users[req.params.id]) {
    return res.status(404).json({ error: 'user not found' });
  }

  const following = storage.follows
    .filter((f) => f.followerId === req.params.id)
    .map((f) => storage.users[f.followeeId])
    .filter(Boolean);

  return res.status(200).json(following);
});

// ── GET /api/users/:id/suggestions ───────────────────────────────────────────
// Friends-of-friends: rank candidates by mutual connection count.
// Exclude: the user themselves and users already followed.
router.get('/:id/suggestions', (req, res) => {
  const userId = req.params.id;
  if (!storage.users[userId]) {
    return res.status(404).json({ error: 'user not found' });
  }

  // Set of user IDs that userId already follows
  const alreadyFollowing = new Set(
    storage.follows
      .filter((f) => f.followerId === userId)
      .map((f) => f.followeeId)
  );

  // For mutual count: how many of userId's followees also follow each candidate
  const mutualCounts = {}; // candidateId → count

  alreadyFollowing.forEach((followeeId) => {
    // People that this followee follows
    storage.follows
      .filter((f) => f.followerId === followeeId)
      .forEach((f) => {
        const candidate = f.followeeId;
        // Exclude self and already-followed users
        if (candidate === userId || alreadyFollowing.has(candidate)) return;
        mutualCounts[candidate] = (mutualCounts[candidate] || 0) + 1;
      });
  });

  // Also include any user not yet followed (even with 0 mutual connections),
  // so the list is never empty when there are available users.
  Object.keys(storage.users).forEach((uid) => {
    if (uid === userId || alreadyFollowing.has(uid)) return;
    if (!(uid in mutualCounts)) mutualCounts[uid] = 0;
  });

  const suggestions = Object.entries(mutualCounts)
    .sort((a, b) => b[1] - a[1]) // highest mutual count first
    .map(([uid, mutualCount]) => ({
      ...storage.users[uid],
      mutualCount,
    }));

  return res.status(200).json(suggestions);
});

module.exports = router;
