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
 * @param {string} path - Request path (e.g., '/api/follow')
 * @param {object} body - Optional request body
 * @returns {Promise} - { status, body }
 */
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    // Serialize body up-front so we can set Content-Length (required for
    // DELETE requests, otherwise express.json() skips parsing and req.body
    // ends up undefined, causing 400 errors in the routes).
    const bodyStr = body !== null ? JSON.stringify(body) : null;
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(bodyStr !== null && { 'Content-Length': Buffer.byteLength(bodyStr) }),
      },
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
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

describe('Follows API', () => {
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

  describe('POST /api/follow - Follow a user', () => {
    it('should follow a user with valid data', async () => {
      const user1Res = await request('POST', '/api/users', {
        username: 'user1',
        displayName: 'User One',
      });
      const user2Res = await request('POST', '/api/users', {
        username: 'user2',
        displayName: 'User Two',
      });

      const res = await request('POST', '/api/follow', {
        followerId: user1Res.body.id,
        followeeId: user2Res.body.id,
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.followerId, user1Res.body.id);
      assert.strictEqual(res.body.followeeId, user2Res.body.id);
    });

    it('should return 400 when followerId is missing', async () => {
      const user2Res = await request('POST', '/api/users', {
        username: 'user2',
        displayName: 'User Two',
      });

      const res = await request('POST', '/api/follow', {
        followeeId: user2Res.body.id,
      });

      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error);
    });

    it('should return 400 when followeeId is missing', async () => {
      const user1Res = await request('POST', '/api/users', {
        username: 'user1',
        displayName: 'User One',
      });

      const res = await request('POST', '/api/follow', {
        followerId: user1Res.body.id,
      });

      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error);
    });

    it('should return 400 when followerId equals followeeId (self-follow)', async () => {
      const user1Res = await request('POST', '/api/users', {
        username: 'user1',
        displayName: 'User One',
      });

      const res = await request('POST', '/api/follow', {
        followerId: user1Res.body.id,
        followeeId: user1Res.body.id,
      });

      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error);
    });

    it('should return 404 when follower user not found', async () => {
      const user2Res = await request('POST', '/api/users', {
        username: 'user2',
        displayName: 'User Two',
      });

      const res = await request('POST', '/api/follow', {
        followerId: 'non-existent-user',
        followeeId: user2Res.body.id,
      });

      assert.strictEqual(res.status, 404);
      assert.ok(res.body.error);
    });

    it('should return 404 when followee user not found', async () => {
      const user1Res = await request('POST', '/api/users', {
        username: 'user1',
        displayName: 'User One',
      });

      const res = await request('POST', '/api/follow', {
        followerId: user1Res.body.id,
        followeeId: 'non-existent-user',
      });

      assert.strictEqual(res.status, 404);
      assert.ok(res.body.error);
    });

    it('should return 400 when already following', async () => {
      const user1Res = await request('POST', '/api/users', {
        username: 'user1',
        displayName: 'User One',
      });
      const user2Res = await request('POST', '/api/users', {
        username: 'user2',
        displayName: 'User Two',
      });

      // Follow once
      await request('POST', '/api/follow', {
        followerId: user1Res.body.id,
        followeeId: user2Res.body.id,
      });

      // Try to follow again
      const res = await request('POST', '/api/follow', {
        followerId: user1Res.body.id,
        followeeId: user2Res.body.id,
      });

      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error);
    });
  });

  describe('DELETE /api/follow - Unfollow a user', () => {
    it('should unfollow successfully and return 200', async () => {
      const user1Res = await request('POST', '/api/users', {
        username: 'user1',
        displayName: 'User One',
      });
      const user2Res = await request('POST', '/api/users', {
        username: 'user2',
        displayName: 'User Two',
      });

      // Follow first
      await request('POST', '/api/follow', {
        followerId: user1Res.body.id,
        followeeId: user2Res.body.id,
      });

      // Then unfollow
      const res = await request('DELETE', '/api/follow', {
        followerId: user1Res.body.id,
        followeeId: user2Res.body.id,
      });

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.message);

      // Verify unfollowed
      const followingRes = await request('GET', `/api/users/${user1Res.body.id}/following`);
      assert.strictEqual(followingRes.body.length, 0);
    });

    it('should return 404 when follow relationship not found', async () => {
      const user1Res = await request('POST', '/api/users', {
        username: 'user1',
        displayName: 'User One',
      });
      const user2Res = await request('POST', '/api/users', {
        username: 'user2',
        displayName: 'User Two',
      });

      // Try to unfollow without following
      const res = await request('DELETE', '/api/follow', {
        followerId: user1Res.body.id,
        followeeId: user2Res.body.id,
      });

      assert.strictEqual(res.status, 404);
      assert.ok(res.body.error);
    });

    it('should return 400 when followerId is missing', async () => {
      const user2Res = await request('POST', '/api/users', {
        username: 'user2',
        displayName: 'User Two',
      });

      const res = await request('DELETE', '/api/follow', {
        followeeId: user2Res.body.id,
      });

      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error);
    });

    it('should return 400 when followeeId is missing', async () => {
      const user1Res = await request('POST', '/api/users', {
        username: 'user1',
        displayName: 'User One',
      });

      const res = await request('DELETE', '/api/follow', {
        followerId: user1Res.body.id,
      });

      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error);
    });
  });
});
