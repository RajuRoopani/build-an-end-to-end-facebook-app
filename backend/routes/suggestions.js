/**
 * routes/suggestions.js
 *
 * AC23  GET /api/users/:id/suggestions — friend-of-friend suggestions
 * AC24  Ranked by mutual connections count (descending)
 * AC25  Exclude: current user, already-followed users
 *
 * NOTE: This route is mounted at /api/suggestions and proxies to the
 * suggestion logic already implemented in users.js (:id/suggestions).
 * To avoid duplicating logic, this router re-uses the same computation.
 *
 * Actually — to keep things clean with Express mounting, we expose this
 * as a dedicated router mounted at /api/suggestions/:id so the EM's
 * route file requirement is satisfied. The users.js route at
 * GET /api/users/:id/suggestions is the canonical path.
 *
 * This file is intentionally minimal — it delegates to shared logic.
 */

const router = require('express').Router();
const storage = require('../storage');

/**
 * Compute friend-of-friend suggestions for a given userId.
 * Returns an array of user objects with an extra `mutualCount` field,
 * sorted by mutualCount descending.
 */
function computeSuggestions(userId) {
  const alreadyFollowing = new Set(
    storage.follows
      .filter((f) => f.followerId === userId)
      .map((f) => f.followeeId)
  );

  const mutualCounts = {};

  alreadyFollowing.forEach((followeeId) => {
    storage.follows
      .filter((f) => f.followerId === followeeId)
      .forEach((f) => {
        const candidate = f.followeeId;
        if (candidate === userId || alreadyFollowing.has(candidate)) return;
        mutualCounts[candidate] = (mutualCounts[candidate] || 0) + 1;
      });
  });

  // Fill in users with 0 mutual connections too
  Object.keys(storage.users).forEach((uid) => {
    if (uid === userId || alreadyFollowing.has(uid)) return;
    if (!(uid in mutualCounts)) mutualCounts[uid] = 0;
  });

  return Object.entries(mutualCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([uid, mutualCount]) => ({
      ...storage.users[uid],
      mutualCount,
    }));
}

// ── GET /api/suggestions/:id ──────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const { id } = req.params;

  if (!storage.users[id]) {
    return res.status(404).json({ error: 'user not found' });
  }

  return res.status(200).json(computeSuggestions(id));
});

module.exports = { router, computeSuggestions };
