/**
 * storage.js — In-memory data store for the Facebook App
 *
 * Data structures:
 *   users:   { [id]: { id, username, displayName, bio, profilePicUrl, createdAt } }
 *   posts:   { [id]: { id, authorId, content, mediaType, mediaUrl, createdAt, likesCount } }
 *   follows: [ { followerId, followeeId } ]
 *   likes:   [ { userId, postId } ]
 *
 * reset() clears all data (used in tests).
 */

const storage = {
  users: {},
  posts: {},
  follows: [],
  likes: [],

  reset() {
    this.users = {};
    this.posts = {};
    this.follows = [];
    this.likes = [];
  },
};

module.exports = storage;
