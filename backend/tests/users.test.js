const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../server');
const storage = require('../storage');

let server;
let baseUrl;

/**
 * Helper function to make HTTP requests.
 * @param {string} method - HTTP method (GET, POST, DELETE, etc.)
 * @param {string} path - Request path (e.g., '/api/users')
 * @param {object} body - Optional request body
 * @returns {Promise} - { status, body }
 */
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: data ? JSON.parse(data) : null,
        });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('Users API', () => {
  // Start server before all tests
  before((_, done) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://localhost:${port}`;
      done();
    });
  });

  // Close server after all tests
  after((_, done) => {
    server.close(done);
  });

  // Reset storage before each test
  beforeEach(() => {
    storage.reset();
  });

  describe('POST /api/users - Create user', () => {
    it('should create a user with valid data', async () => {
      const res = await request('POST', '/api/users', {
        username: 'john_doe',
        displayName: 'John Doe',
        bio: 'Software engineer',
        profilePicUrl: 'https://example.com/pic.jpg',
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.username, 'john_doe');
      assert.strictEqual(res.body.displayName, 'John Doe');
      assert.strictEqual(res.body.bio, 'Software engineer');
      assert.strictEqual(res.body.profilePicUrl, 'https://example.com/pic.jpg');
      assert.ok(res.body.id);
      assert.ok(res.body.createdAt);
    });

    it('should return 400 when username is missing', async () => {
      const res = await request('POST', '/api/users', {
        displayName: 'John Doe',
      });

      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error);
    });

    it('should return 400 when displayName is missing', async () => {
      const res = await request('POST', '/api/users', {
        username: 'john_doe',
      });

      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error);
    });

    it('should return 400 for duplicate username (case-insensitive)', async () => {
      // Create first user
      await request('POST', '/api/users', {
        username: 'john_doe',
        displayName: 'John Doe',
      });

      // Try to create second user with same username (different case)
      const res = await request('POST', '/api/users', {
        username: 'JOHN_DOE',
        displayName: 'Another John',
      });

      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error);
    });

    it('should allow user without bio and profilePicUrl', async () => {
      const res = await request('POST', '/api/users', {
        username: 'jane_doe',
        displayName: 'Jane Doe',
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.bio, '');
      assert.strictEqual(res.body.profilePicUrl, null);
    });
  });

  describe('GET /api/users - List all users', () => {
    it('should return empty array when no users exist', async () => {
      const res = await request('GET', '/api/users');

      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(res.body, []);
    });

    it('should return array of all users', async () => {
      // Create two users
      await request('POST', '/api/users', {
        username: 'user1',
        displayName: 'User One',
      });
      await request('POST', '/api/users', {
        username: 'user2',
        displayName: 'User Two',
      });

      const res = await request('GET', '/api/users');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.length, 2);
      assert.ok(res.body.some((u) => u.username === 'user1'));
      assert.ok(res.body.some((u) => u.username === 'user2'));
    });
  });

  describe('GET /api/users/:id - Get user profile', () => {
    it('should return user with follower, following, and post counts', async () => {
      const createRes = await request('POST', '/api/users', {
        username: 'john_doe',
        displayName: 'John Doe',
      });
      const userId = createRes.body.id;

      const res = await request('GET', `/api/users/${userId}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.username, 'john_doe');
      assert.strictEqual(res.body.followerCount, 0);
      assert.strictEqual(res.body.followingCount, 0);
      assert.strictEqual(res.body.postCount, 0);
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request('GET', '/api/users/non-existent-id');

      assert.strictEqual(res.status, 404);
      assert.ok(res.body.error);
    });
  });

  describe('GET /api/users/:userId/posts - Get user posts', () => {
    it('should return array of user posts sorted newest first', async () => {
      const userRes = await request('POST', '/api/users', {
        username: 'john_doe',
        displayName: 'John Doe',
      });
      const userId = userRes.body.id;

      // Create two posts for this user
      await request('POST', '/api/posts', {
        authorId: userId,
        content: 'First post',
      });
      // Small delay to ensure different timestamps
      await new Promise((r) => setTimeout(r, 10));
      await request('POST', '/api/posts', {
        authorId: userId,
        content: 'Second post',
      });

      const res = await request('GET', `/api/users/${userId}/posts`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.length, 2);
      // Should be sorted newest first
      assert.strictEqual(res.body[0].content, 'Second post');
      assert.strictEqual(res.body[1].content, 'First post');
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request('GET', '/api/users/non-existent-id/posts');

      assert.strictEqual(res.status, 404);
      assert.ok(res.body.error);
    });
  });

  describe('GET /api/users/:id/followers - List followers', () => {
    it('should return array of follower user objects', async () => {
      const user1Res = await request('POST', '/api/users', {
        username: 'user1',
        displayName: 'User One',
      });
      const user2Res = await request('POST', '/api/users', {
        username: 'user2',
        displayName: 'User Two',
      });

      // user1 follows user2
      await request('POST', '/api/follow', {
        followerId: user1Res.body.id,
        followeeId: user2Res.body.id,
      });

      const res = await request('GET', `/api/users/${user2Res.body.id}/followers`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.length, 1);
      assert.strictEqual(res.body[0].username, 'user1');
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request('GET', '/api/users/non-existent-id/followers');

      assert.strictEqual(res.status, 404);
      assert.ok(res.body.error);
    });
  });

  describe('GET /api/users/:id/following - List following', () => {
    it('should return array of following user objects', async () => {
      const user1Res = await request('POST', '/api/users', {
        username: 'user1',
        displayName: 'User One',
      });
      const user2Res = await request('POST', '/api/users', {
        username: 'user2',
        displayName: 'User Two',
      });

      // user1 follows user2
      await request('POST', '/api/follow', {
        followerId: user1Res.body.id,
        followeeId: user2Res.body.id,
      });

      const res = await request('GET', `/api/users/${user1Res.body.id}/following`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.length, 1);
      assert.strictEqual(res.body[0].username, 'user2');
    });
  });

  describe('GET /api/users/:id/suggestions - Friend suggestions', () => {
    it('should return friend suggestions ranked by mutual connections', async () => {
      const user1Res = await request('POST', '/api/users', {
        username: 'user1',
        displayName: 'User One',
      });
      const user2Res = await request('POST', '/api/users', {
        username: 'user2',
        displayName: 'User Two',
      });
      const user3Res = await request('POST', '/api/users', {
        username: 'user3',
        displayName: 'User Three',
      });

      // user1 follows user2, user2 follows user3
      await request('POST', '/api/follow', {
        followerId: user1Res.body.id,
        followeeId: user2Res.body.id,
      });
      await request('POST', '/api/follow', {
        followerId: user2Res.body.id,
        followeeId: user3Res.body.id,
      });

      const res = await request('GET', `/api/users/${user1Res.body.id}/suggestions`);

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      // Should include user3 (friend of friend)
      const user3Suggestion = res.body.find((u) => u.username === 'user3');
      assert.ok(user3Suggestion);
      assert.ok(user3Suggestion.mutualCount >= 1);
    });
  });
});
