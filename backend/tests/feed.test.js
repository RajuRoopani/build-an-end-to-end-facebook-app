/**
 * tests/feed.test.js
 *
 * Tests for the Feed API:
 *   GET /api/feed/:userId — returns posts from users the given user follows,
 *                           sorted newest-first; does NOT include user's own posts.
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
 * @param {string} path   - Request path
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
async function createPost(authorId, content = 'Default post content') {
  const res = await request('POST', '/api/posts', { authorId, content });
  assert.strictEqual(res.status, 201, `createPost failed: ${JSON.stringify(res.body)}`);
  return res.body;
}

/** Follow a user (followerId follows followeeId). */
async function follow(followerId, followeeId) {
  const res = await request('POST', '/api/follow', { followerId, followeeId });
  assert.strictEqual(res.status, 201, `follow failed: ${JSON.stringify(res.body)}`);
  return res.body;
}

describe('Feed API', () => {
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

  describe('GET /api/feed/:userId', () => {
    it('should return posts from followed users only (NOT the requester\'s own posts)', async () => {
      const alice = await createUser('alice_feed', 'Alice Feed');
      const bob = await createUser('bob_feed', 'Bob Feed');

      // Alice posts something
      await createPost(alice.id, 'Alice own post — should NOT appear in alice feed');
      // Bob posts something
      await createPost(bob.id, 'Bob post — should appear in alice feed after follow');

      // Alice follows Bob
      await follow(alice.id, bob.id);

      const res = await request('GET', `/api/feed/${alice.id}`);

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body), 'Feed should be an array');

      // Feed must contain Bob's post
      assert.ok(
        res.body.some((p) => p.authorId === bob.id),
        'Feed should include posts from followed user (Bob)'
      );

      // Feed must NOT contain Alice's own post
      assert.ok(
        !res.body.some((p) => p.authorId === alice.id),
        'Feed should NOT include the requester\'s own posts'
      );
    });

    it('should return posts sorted newest first', async () => {
      const alice = await createUser('alice_sort', 'Alice Sort');
      const bob = await createUser('bob_sort', 'Bob Sort');

      await follow(alice.id, bob.id);

      // Create posts with a small delay to ensure different timestamps
      const post1 = await createPost(bob.id, 'Bob first post');
      // Manually adjust createdAt in storage to guarantee ordering
      storage.posts[post1.id].createdAt = new Date(Date.now() - 5000).toISOString();

      const post2 = await createPost(bob.id, 'Bob second post (newer)');
      storage.posts[post2.id].createdAt = new Date(Date.now() - 1000).toISOString();

      const res = await request('GET', `/api/feed/${alice.id}`);

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.strictEqual(res.body.length, 2);

      // Newest should come first
      const firstCreatedAt = new Date(res.body[0].createdAt).getTime();
      const secondCreatedAt = new Date(res.body[1].createdAt).getTime();
      assert.ok(
        firstCreatedAt >= secondCreatedAt,
        'Feed posts should be sorted newest first'
      );
    });

    it('should return 404 for a non-existent user', async () => {
      const res = await request('GET', '/api/feed/non-existent-user-id');

      assert.strictEqual(res.status, 404);
      assert.ok(res.body.error, 'Expected error message in body');
    });

    it('should return empty array when user follows nobody', async () => {
      const loner = await createUser('loner_user', 'Loner L');
      // Create a post so there IS data in storage — it just shouldn't appear
      await createPost(loner.id, 'Loner post (should not appear in own feed)');

      const res = await request('GET', `/api/feed/${loner.id}`);

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body), 'Feed should be an array');
      assert.strictEqual(res.body.length, 0, 'Feed should be empty when user follows nobody');
    });

    it('should include an author object in each feed post', async () => {
      const alice = await createUser('alice_author', 'Alice Author');
      const bob = await createUser('bob_author', 'Bob Author');

      await follow(alice.id, bob.id);
      await createPost(bob.id, 'Post with author info');

      const res = await request('GET', `/api/feed/${alice.id}`);

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.length > 0, 'Feed should contain at least one post');

      const feedPost = res.body[0];
      assert.ok(feedPost.author, 'Each feed post should have an author object');
      assert.strictEqual(feedPost.author.id, bob.id, 'Author id should match the post author');
      assert.ok(feedPost.author.username, 'Author object should include username');
      assert.ok(feedPost.author.displayName, 'Author object should include displayName');
    });

    it('should aggregate posts from multiple followed users', async () => {
      const alice = await createUser('alice_multi', 'Alice Multi');
      const bob = await createUser('bob_multi', 'Bob Multi');
      const carol = await createUser('carol_multi', 'Carol Multi');

      await follow(alice.id, bob.id);
      await follow(alice.id, carol.id);

      const bobPost = await createPost(bob.id, 'Bob multi post');
      const carolPost = await createPost(carol.id, 'Carol multi post');

      const res = await request('GET', `/api/feed/${alice.id}`);

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.strictEqual(res.body.length, 2, 'Feed should contain posts from all followed users');

      const ids = res.body.map((p) => p.id);
      assert.ok(ids.includes(bobPost.id), 'Bob\'s post should be in the feed');
      assert.ok(ids.includes(carolPost.id), 'Carol\'s post should be in the feed');
    });
  });
});
