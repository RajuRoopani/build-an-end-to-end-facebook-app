# Facebook App

A **Facebook-like social media REST API** built with Node.js and Express. Create users, post content, follow other users, like posts, and discover personalized feeds and friend suggestions through a clean, RESTful API.

## Features

✨ **Core Functionality:**
- **User Registration** with unique username enforcement
- **Create, Read, Delete Posts** with support for text, images, and videos
- **Follow / Unfollow** other users
- **Like / Unlike Posts** with real-time like counters
- **Personalized Feed** showing posts only from followed users (reverse chronological)
- **Friend Suggestions** ranked by mutual connections (friends-of-friends algorithm)
- **Seed Data** — 6 users, 9 posts, 8 follows, and 5 likes pre-loaded for demo/testing
- **In-Memory Storage** — no database setup required; `reset()` for test isolation
- **Health Check Endpoint** for monitoring

## Tech Stack

- **Backend:** Node.js + Express 4.18+
- **Storage:** In-memory (JavaScript objects) with seed data
- **Frontend:** Vanilla HTML/CSS/JS single-page application
- **Testing:** Node.js built-in `node:test` module
- **Utilities:** `uuid` (unique ID generation), `cors` (cross-origin requests)

## Quick Start

### Prerequisites
- Node.js 16+ installed

### Setup & Installation

```bash
# Navigate to backend directory
cd facebook_app/backend

# Install dependencies
npm install

# Start the server (runs on http://localhost:3000)
npm start

# In another terminal, run all tests
npm test
```

The API will be available at `http://localhost:3000/api/`  
The frontend will be served at `http://localhost:3000/`

### Example: Create a User

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "displayName": "Alice Smith",
    "bio": "Software engineer & coffee enthusiast",
    "profilePicUrl": "https://example.com/alice.jpg"
  }'
```

## API Documentation

All endpoints are prefixed with `/api/`. Responses are JSON. Status codes follow REST conventions.

### Users Endpoints

| Method | Path | Description | Status Codes |
|--------|------|-------------|--------------|
| POST | `/users` | Create user (requires `username`, `displayName`) | 201, 400 |
| GET | `/users` | List all users | 200 |
| GET | `/users/:id` | Get user profile with follower/following/post counts | 200, 404 |
| GET | `/users/:userId/posts` | Get all posts by a user (newest first) | 200, 404 |
| GET | `/users/:id/followers` | List users following this user | 200, 404 |
| GET | `/users/:id/following` | List users this user follows | 200, 404 |
| GET | `/users/:id/suggestions` | Get friend suggestions ranked by mutual connections | 200, 404 |

### Posts Endpoints

| Method | Path | Description | Status Codes |
|--------|------|-------------|--------------|
| POST | `/posts` | Create post (requires `authorId`, `content`) | 201, 400 |
| GET | `/posts` | List all posts (newest first) | 200 |
| GET | `/posts/:id` | Get single post with author info | 200, 404 |
| DELETE | `/posts/:id` | Delete post (also removes associated likes) | 204, 404 |
| GET | `/posts/:id/likes` | List users who liked the post | 200, 404 |

### Follows Endpoints

| Method | Path | Description | Status Codes |
|--------|------|-------------|--------------|
| POST | `/follow` | Follow a user (requires `followerId`, `followeeId`) | 201, 400 |
| DELETE | `/follow` | Unfollow a user (requires `followerId`, `followeeId`) | 204, 400 |

### Likes Endpoints

| Method | Path | Description | Status Codes |
|--------|------|-------------|--------------|
| POST | `/posts/:id/like` | Like a post (requires `userId`) | 201, 400, 404 |
| DELETE | `/posts/:id/like` | Unlike a post (requires `userId`) | 204, 400, 404 |

### Feed Endpoint

| Method | Path | Description | Status Codes |
|--------|------|-------------|--------------|
| GET | `/feed/:userId` | Get personalized feed for user (posts from followed users, newest first) | 200, 404 |

### Suggestions Endpoint

| Method | Path | Description | Status Codes |
|--------|------|-------------|--------------|
| GET | `/suggestions/:userId` | Get friend suggestions ranked by mutual connection count | 200, 404 |

### Health Check

| Method | Path | Description | Status Codes |
|--------|------|-------------|--------------|
| GET | `/health` | Server health check | 200 |

**Total: 18 endpoints**

## Data Models

### User

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "alice",
  "displayName": "Alice Smith",
  "bio": "Software engineer",
  "profilePicUrl": "https://example.com/alice.jpg",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**Fields:**
- `id` (UUID) — unique identifier
- `username` (string) — unique, case-insensitive
- `displayName` (string) — user's display name
- `bio` (string, optional) — user biography
- `profilePicUrl` (string, optional) — URL to profile picture
- `createdAt` (ISO 8601) — account creation timestamp

**Profile Response** (includes counts):
```json
{
  "id": "550e8400-...",
  "username": "alice",
  "displayName": "Alice Smith",
  "bio": "Software engineer",
  "profilePicUrl": "...",
  "createdAt": "2024-01-15T10:30:00Z",
  "followerCount": 42,
  "followingCount": 18,
  "postCount": 5
}
```

### Post

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "authorId": "550e8400-e29b-41d4-a716-446655440000",
  "content": "Just shipped a new feature!",
  "mediaType": "image",
  "mediaUrl": "https://example.com/post-image.jpg",
  "createdAt": "2024-01-15T11:00:00Z",
  "likesCount": 12
}
```

**Fields:**
- `id` (UUID) — unique identifier
- `authorId` (UUID) — ID of the user who posted
- `content` (string) — post text content (required)
- `mediaType` (string, optional) — `"image"` or `"video"` or `null`
- `mediaUrl` (string, optional) — URL to media
- `createdAt` (ISO 8601) — post creation timestamp
- `likesCount` (number) — count of likes

**Post with Author** (GET single post):
```json
{
  "id": "660e8400-...",
  "authorId": "550e8400-...",
  "content": "Just shipped a new feature!",
  "mediaType": "image",
  "mediaUrl": "...",
  "createdAt": "2024-01-15T11:00:00Z",
  "likesCount": 12,
  "author": {
    "id": "550e8400-...",
    "username": "alice",
    "displayName": "Alice Smith",
    "...": "..."
  }
}
```

### Follow

```json
{
  "followerId": "550e8400-...",
  "followeeId": "660e8400-..."
}
```

**Fields:**
- `followerId` — UUID of the user doing the following
- `followeeId` — UUID of the user being followed

### Like

```json
{
  "userId": "550e8400-...",
  "postId": "660e8400-..."
}
```

**Fields:**
- `userId` — UUID of the user liking
- `postId` — UUID of the post being liked

## Project Structure

```
facebook_app/
├── backend/
│   ├── server.js              # Express app entry point
│   │                           # • Mounts all 6 API routers
│   │                           # • Serves frontend as static files
│   │                           # • Includes CORS & JSON middleware
│   │                           # • Health check + 404 handler
│   │
│   ├── storage.js             # In-memory data store
│   │                           # • Centralized storage for users, posts, follows, likes
│   │                           # • reset() clears all data (test isolation)
│   │
│   ├── seed.js                # Seed data initializer
│   │                           # • Pre-loads 6 sample users
│   │                           # • Pre-loads 9 sample posts
│   │                           # • Pre-loads 8 sample follows
│   │                           # • Pre-loads 5 sample likes
│   │
│   ├── package.json           # NPM dependencies & scripts
│   │
│   ├── routes/
│   │   ├── users.js           # User CRUD + follower/following/suggestions
│   │   ├── posts.js           # Post CRUD + likes list
│   │   ├── follows.js         # Follow/unfollow endpoints
│   │   ├── likes.js           # Like/unlike endpoints
│   │   ├── feed.js            # Personalized feed
│   │   └── suggestions.js     # Friend suggestions
│   │
│   └── tests/
│       ├── users.test.js      # Tests for user endpoints (~16 tests)
│       ├── posts.test.js      # Tests for post endpoints (~15 tests)
│       └── follows.test.js    # Tests for follow/like/feed/suggestions (~20+ tests)
│
├── frontend/
│   └── index.html             # Vanilla HTML/CSS/JS SPA
│
├── docs/
│   ├── facebook-api-design.md # API specification (contracts & constraints)
│   └── adr/
│       └── ADR-001-nodejs-express-in-memory.md  # Architecture decision
│
└── README.md                  # This file
```

## Testing

### Run All Tests

```bash
cd facebook_app/backend
npm test
```

Tests use Node.js built-in `node:test` module. Each test file covers happy paths, error cases, and edge cases:

- **users.test.js** (~16 tests) — user creation, uniqueness constraints, profile retrieval, post/follower/following/suggestion sub-routes
- **posts.test.js** (~15 tests) — post creation, deletion, media validation, likes counter
- **follows.test.js** (~20+ tests) — follow/unfollow operations, feed generation, like operations, suggestions algorithm

**Test Coverage:**
- ✅ HTTP status codes (201, 200, 204, 404, 400)
- ✅ Input validation (missing fields, invalid types)
- ✅ Constraint enforcement (unique usernames, existing references)
- ✅ Business logic (feed filtering, mutual friend ranking)
- ✅ Edge cases (duplicate operations, cascading deletes)

### Test Isolation

Each test file calls `storage.reset()` in a setup fixture to ensure clean state. No persistent data between test runs.

## Example Workflows

### Create a User & Post

```bash
# 1. Create user
USER=$(curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","displayName":"Alice"}' | jq -r '.id')

# 2. Create post
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d "{\"authorId\":\"$USER\",\"content\":\"Hello, world!\"}"
```

### Follow & Like

```bash
# Follow alice (USER1) from bob (USER2)
curl -X POST http://localhost:3000/api/follow \
  -H "Content-Type: application/json" \
  -d "{\"followerId\":\"$USER2\",\"followeeId\":\"$USER1\"}"

# Like a post
curl -X POST http://localhost:3000/api/posts/$POST_ID/like \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER2\"}"
```

### Get Personalized Feed

```bash
# Get posts from users that alice follows (newest first)
curl http://localhost:3000/api/feed/$ALICE_ID | jq '.'
```

### Friend Suggestions

```bash
# Get suggested friends for alice (ranked by mutual connections)
curl http://localhost:3000/api/users/$ALICE_ID/suggestions | jq '.'
```

## Error Handling

All errors return JSON with an `error` field and appropriate HTTP status code:

```json
{
  "error": "username already taken"
}
```

**Common Status Codes:**
- `400` — Bad Request (missing/invalid fields, constraint violations)
- `404` — Not Found (user, post, or other resource doesn't exist)
- `500` — Internal Server Error (unexpected error)

## Implementation Notes

### In-Memory Storage
- Data is stored in JavaScript objects (not persisted to disk)
- Ideal for prototyping, testing, and demos
- To persist data, integrate a database (MongoDB, PostgreSQL, etc.)

### UUID Generation
- User and post IDs use UUID v4 for uniqueness
- Follow and like relationships use the IDs directly

### Timeouts & Cleanup
- Seed data includes sample objects to get started immediately
- `storage.reset()` used by tests to clean up between runs

### CORS
- CORS is enabled to allow frontend requests from any origin
- In production, configure CORS to specific domains

## Deployment

The application is ready for deployment. To run on a different port:

```bash
PORT=8080 npm start
```

To integrate with a persistent database:
1. Update `storage.js` to use your database client (e.g., `mongoose`, `knex`)
2. Implement CRUD methods using database queries
3. Update `seed.js` to seed from database instead of in-memory

## Support & Contributing

For issues or contributions, please refer to the project repository.

---

**Built with ❤️ using Node.js, Express, and vanilla JavaScript**
