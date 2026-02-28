/**
 * tests/likes.test.js
 *
 * Tests for the Likes API:
 *   POST   /api/posts/:id/like   — like a post
 *   DELETE /api/posts/:id/like   — unlike a post
 *   GET    /api/posts/:id/likes  — list users who liked a post
 */

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
 * @param {string} path   - Request path (e.g., '/api/posts/abc/like')
 * @param {object} body   - Optional request body
 * @returns {Promise<{ status: number, body: any }>}
 */
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    // Serialize body up-front so we can set Content-Length (required for
    // DELETE requests, otherwise express.json() skips parsing and req.body
    // ends up undefined, causing destructuring errors in the routes).
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
    if (bodyStr !== null) req.write(bodyStr);
    req.end();
  });
}

/** Create a user and return the response body. */
async function createUser(username, displayName) {
  const res = await request('POST', '/api/users', { username, displayName });
  assert.strictEqual(res.status, 201, `createUser(${username}) failed: ${JSON.stringify(res.body)}`);
  return res.body;
}

/** Create a post and return the response body. */
async function createPost(authorId, content = 'Test post content') {
  const res = await request('POST', '/api/posts', { authorId, content });
  assert.strictEqual(res.status, 201, `createPost failed: ${JSON.stringify(res.body)}`);
  return res.body;
}

describe('Likes API', () => {
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

  // Reset storage before each test for clean state
  beforeEach(() => {
    storage.reset();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /api/posts/:id/like
  // ─────────────────────────────────────────────────────────────────────────
  describe('POST /api/posts/:id/like — Like a post', () => {
    it('should like a post successfully and return 201 with userId, postId, likesCount', async () => {
      const user = await createUser('alice', 'Alice A');
      const post = await createPost(user.id);

      const res = await request('POST', `/api/posts/${post.id}/like`, { userId: user.id });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.userId, user.id);
      assert.strictEqual(res.body.postId, post.id);
      assert.strictEqual(typeof res.body.likesCount, 'number');
    });

    it('should return 400 when userId is missing', async () => {
      const user = await createUser('bob', 'Bob B');
      const post = await createPost(user.id);

      const res = await request('POST', `/api/posts/${post.id}/like`, {});

      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error, 'Expected error message in body');
    });

    it('should return 404 when post does not exist', async () => {
      const user = await createUser('carol', 'Carol C');

      const res = await request('POST', '/api/posts/non-existent-post-id/like', {
        userId: user.id,
      });

      assert.strictEqual(res.status, 404);
      assert.ok(res.body.error, 'Expected error message in body');
    });

    it('should return 404 when user does not exist', async () => {
      const user = await createUser('dave', 'Dave D');
      const post = await createPost(user.id);

      const res = await request('POST', `/api/posts/${post.id}/like`, {
        userId: 'non-existent-user-id',
      });

      assert.strictEqual(res.status, 404);
      assert.ok(res.body.error, 'Expected error message in body');
    });

    it('should return 400 when user tries to like the same post twice (duplicate)', async () => {
      const user = await createUser('eve', 'Eve E');
      const post = await createPost(user.id);

      // Like it once
      await request('POST', `/api/posts/${post.id}/like`, { userId: user.id });

      // Try to like again
      const res = await request('POST', `/api/posts/${post.id}/like`, { userId: user.id });

      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error, 'Expected error message in body');
    });

    it('should increment likesCount correctly after liking', async () => {
      const user1 = await createUser('frank', 'Frank F');
      const user2 = await createUser('grace', 'Grace G');
      const post = await createPost(user1.id);

      // Initial likesCount is 0
      assert.strictEqual(post.likesCount, 0);

      // First like
      const res1 = await request('POST', `/api/posts/${post.id}/like`, { userId: user1.id });
      assert.strictEqual(res1.status, 201);
      assert.strictEqual(res1.body.likesCount, 1);

      // Second like from a different user
      const res2 = await request('POST', `/api/posts/${post.id}/like`, { userId: user2.id });
      assert.strictEqual(res2.status, 201);
      assert.strictEqual(res2.body.likesCount, 2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE /api/posts/:id/like
  // ─────────────────────────────────────────────────────────────────────────
  describe('DELETE /api/posts/:id/like — Unlike a post', () => {
    it('should unlike a post successfully and return 200 with message and likesCount', async () => {
      const user = await createUser('hannah', 'Hannah H');
      const post = await createPost(user.id);

      // Like first
      await request('POST', `/api/posts/${post.id}/like`, { userId: user.id });

      // Now unlike
      const res = await request('DELETE', `/api/posts/${post.id}/like`, { userId: user.id });

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.message, 'Expected message in body');
      assert.strictEqual(typeof res.body.likesCount, 'number');
    });

    it('should return 404 when like does not exist (user never liked the post)', async () => {
      const user = await createUser('ivan', 'Ivan I');
      const post = await createPost(user.id);

      // Try to unlike without ever liking
      const res = await request('DELETE', `/api/posts/${post.id}/like`, { userId: user.id });

      assert.strictEqual(res.status, 404);
      assert.ok(res.body.error, 'Expected error message in body');
    });

    it('should return 400 when userId is missing on unlike', async () => {
      const user = await createUser('judy', 'Judy J');
      const post = await createPost(user.id);

      const res = await request('DELETE', `/api/posts/${post.id}/like`, {});

      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error, 'Expected error message in body');
    });

    it('should decrement likesCount correctly after unliking', async () => {
      const user1 = await createUser('kyle', 'Kyle K');
      const user2 = await createUser('lisa', 'Lisa L');
      const post = await createPost(user1.id);

      // Two users like the post
      await request('POST', `/api/posts/${post.id}/like`, { userId: user1.id });
      await request('POST', `/api/posts/${post.id}/like`, { userId: user2.id });

      // user1 unlikes → should be 1
      const res = await request('DELETE', `/api/posts/${post.id}/like`, { userId: user1.id });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.likesCount, 1);

      // user2 unlikes → should be 0
      const res2 = await request('DELETE', `/api/posts/${post.id}/like`, { userId: user2.id });
      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res2.body.likesCount, 0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /api/posts/:id/likes
  // ─────────────────────────────────────────────────────────────────────────
  describe('GET /api/posts/:id/likes — List users who liked a post', () => {
    it('should return array of user objects who liked the post', async () => {
      const user1 = await createUser('mike', 'Mike M');
      const user2 = await createUser('nina', 'Nina N');
      const post = await createPost(user1.id);

      await request('POST', `/api/posts/${post.id}/like`, { userId: user1.id });
      await request('POST', `/api/posts/${post.id}/like`, { userId: user2.id });

      const res = await request('GET', `/api/posts/${post.id}/likes`);

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body), 'Expected array of users');
      assert.strictEqual(res.body.length, 2);

      // Ensure the returned objects have user IDs
      const returnedIds = res.body.map((u) => u.id);
      assert.ok(returnedIds.includes(user1.id), 'user1 should be in likers list');
      assert.ok(returnedIds.includes(user2.id), 'user2 should be in likers list');
    });

    it('should return 404 for a non-existent post', async () => {
      const res = await request('GET', '/api/posts/no-such-post/likes');

      assert.strictEqual(res.status, 404);
      assert.ok(res.body.error, 'Expected error message in body');
    });

    it('should return empty array when post has no likes', async () => {
      const user = await createUser('oscar', 'Oscar O');
      const post = await createPost(user.id);

      const res = await request('GET', `/api/posts/${post.id}/likes`);

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body), 'Expected array');
      assert.strictEqual(res.body.length, 0);
    });
  });
});
