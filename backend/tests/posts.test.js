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
 * @param {string} path - Request path (e.g., '/api/posts')
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

describe('Posts API', () => {
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

  describe('POST /api/posts - Create post', () => {
    it('should create a post with valid data', async () => {
      // First create a user
      const userRes = await request('POST', '/api/users', {
        username: 'john_doe',
        displayName: 'John Doe',
      });
      const userId = userRes.body.id;

      const res = await request('POST', '/api/posts', {
        authorId: userId,
        content: 'Hello world!',
        mediaType: 'image',
        mediaUrl: 'https://example.com/image.jpg',
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.authorId, userId);
      assert.strictEqual(res.body.content, 'Hello world!');
      assert.strictEqual(res.body.mediaType, 'image');
      assert.strictEqual(res.body.mediaUrl, 'https://example.com/image.jpg');
      assert.strictEqual(res.body.likesCount, 0);
      assert.ok(res.body.id);
      assert.ok(res.body.createdAt);
    });

    it('should return 400 when authorId is missing', async () => {
      const res = await request('POST', '/api/posts', {
        content: 'Hello world!',
      });

      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error);
    });

    it('should return 400 when authorId does not refer to valid user', async () => {
      const res = await request('POST', '/api/posts', {
        authorId: 'non-existent-user-id',
        content: 'Hello world!',
      });

      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error);
    });

    it('should return 400 when content is missing', async () => {
      const userRes = await request('POST', '/api/users', {
        username: 'john_doe',
        displayName: 'John Doe',
      });

      const res = await request('POST', '/api/posts', {
        authorId: userRes.body.id,
      });

      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error);
    });

    it('should return 400 when content is empty string', async () => {
      const userRes = await request('POST', '/api/users', {
        username: 'john_doe',
        displayName: 'John Doe',
      });

      const res = await request('POST', '/api/posts', {
        authorId: userRes.body.id,
        content: '   ',
      });

      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error);
    });

    it('should return 400 for invalid mediaType', async () => {
      const userRes = await request('POST', '/api/users', {
        username: 'john_doe',
        displayName: 'John Doe',
      });

      const res = await request('POST', '/api/posts', {
        authorId: userRes.body.id,
        content: 'Hello world!',
        mediaType: 'invalid',
      });

      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error);
    });

    it('should create post without media', async () => {
      const userRes = await request('POST', '/api/users', {
        username: 'john_doe',
        displayName: 'John Doe',
      });

      const res = await request('POST', '/api/posts', {
        authorId: userRes.body.id,
        content: 'Just text',
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.mediaType, null);
      assert.strictEqual(res.body.mediaUrl, null);
    });
  });

  describe('GET /api/posts - List all posts', () => {
    it('should return all posts sorted newest first', async () => {
      const userRes = await request('POST', '/api/users', {
        username: 'john_doe',
        displayName: 'John Doe',
      });
      const userId = userRes.body.id;

      // Create two posts
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

      const res = await request('GET', '/api/posts');

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.length, 2);
      // Should be sorted newest first
      assert.strictEqual(res.body[0].content, 'Second post');
      assert.strictEqual(res.body[1].content, 'First post');
    });
  });

  describe('GET /api/posts/:id - Get single post', () => {
    it('should return post with author object', async () => {
      const userRes = await request('POST', '/api/users', {
        username: 'john_doe',
        displayName: 'John Doe',
      });
      const userId = userRes.body.id;

      const postRes = await request('POST', '/api/posts', {
        authorId: userId,
        content: 'Hello world!',
      });
      const postId = postRes.body.id;

      const res = await request('GET', `/api/posts/${postId}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.content, 'Hello world!');
      assert.ok(res.body.author);
      assert.strictEqual(res.body.author.username, 'john_doe');
    });

    it('should return 404 for non-existent post', async () => {
      const res = await request('GET', '/api/posts/non-existent-id');

      assert.strictEqual(res.status, 404);
      assert.ok(res.body.error);
    });
  });

  describe('DELETE /api/posts/:id - Delete post', () => {
    it('should delete post and return 204', async () => {
      const userRes = await request('POST', '/api/users', {
        username: 'john_doe',
        displayName: 'John Doe',
      });
      const userId = userRes.body.id;

      const postRes = await request('POST', '/api/posts', {
        authorId: userId,
        content: 'To be deleted',
      });
      const postId = postRes.body.id;

      const res = await request('DELETE', `/api/posts/${postId}`);

      assert.strictEqual(res.status, 204);

      // Verify post is deleted
      const getRes = await request('GET', `/api/posts/${postId}`);
      assert.strictEqual(getRes.status, 404);
    });

    it('should clean up likes when post is deleted', async () => {
      const userRes = await request('POST', '/api/users', {
        username: 'john_doe',
        displayName: 'John Doe',
      });
      const userId = userRes.body.id;

      const postRes = await request('POST', '/api/posts', {
        authorId: userId,
        content: 'To be deleted',
      });
      const postId = postRes.body.id;

      // Like the post (manually add like to storage for testing)
      storage.likes.push({ userId: userId, postId: postId });

      const res = await request('DELETE', `/api/posts/${postId}`);

      assert.strictEqual(res.status, 204);
      // Verify likes are cleaned up
      assert.strictEqual(storage.likes.filter((l) => l.postId === postId).length, 0);
    });

    it('should return 404 for non-existent post', async () => {
      const res = await request('DELETE', '/api/posts/non-existent-id');

      assert.strictEqual(res.status, 404);
      assert.ok(res.body.error);
    });
  });

  describe('GET /api/posts/:id/likes - List likers', () => {
    it('should return array of user objects who liked the post', async () => {
      const user1Res = await request('POST', '/api/users', {
        username: 'user1',
        displayName: 'User One',
      });
      const user2Res = await request('POST', '/api/users', {
        username: 'user2',
        displayName: 'User Two',
      });

      const postRes = await request('POST', '/api/posts', {
        authorId: user1Res.body.id,
        content: 'Cool post',
      });
      const postId = postRes.body.id;

      // Add like manually to storage
      storage.likes.push({ userId: user2Res.body.id, postId });

      const res = await request('GET', `/api/posts/${postId}/likes`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.length, 1);
      assert.strictEqual(res.body[0].username, 'user2');
    });

    it('should return 404 for non-existent post', async () => {
      const res = await request('GET', '/api/posts/non-existent-id/likes');

      assert.strictEqual(res.status, 404);
      assert.ok(res.body.error);
    });

    it('should return empty array when post has no likes', async () => {
      const userRes = await request('POST', '/api/users', {
        username: 'john_doe',
        displayName: 'John Doe',
      });

      const postRes = await request('POST', '/api/posts', {
        authorId: userRes.body.id,
        content: 'Cool post',
      });
      const postId = postRes.body.id;

      const res = await request('GET', `/api/posts/${postId}/likes`);

      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(res.body, []);
    });
  });
});
