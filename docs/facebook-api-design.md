# Facebook App — Backend Architecture

## Overview

A Node.js/Express REST API providing social-media features: user profiles, posts (text/image/video), follow graph, likes, personalised feed, and friend-of-friend suggestions. All state is held in a single in-memory module (`storage.js`) that can be reset between test runs.

---

## Components

| Component | File | Role |
|---|---|---|
| Entry point | `server.js` | Express app bootstrap, middleware, router mounting, static serving |
| Storage | `storage.js` | Singleton in-memory store; exported object with `reset()` |
| Seed | `seed.js` | Populates store with 6 users, 9 posts, 8 follows, 5 likes |
| Users router | `routes/users.js` | User CRUD + followers/following/posts/suggestions sub-routes |
| Posts router | `routes/posts.js` | Post CRUD |
| Follows router | `routes/follows.js` | Follow / unfollow |
| Likes router | `routes/likes.js` | Like / unlike / list likers |
| Feed router | `routes/feed.js` | Personalised feed |
| Suggestions router | `routes/suggestions.js` | Friend-of-friend recommendations |

---

## Data Flow

```
Client
  │
  ├── GET  /          → static frontend/index.html
  │
  └── /api/*
        ├── /users              → users.js router
        │     ├── /:id/posts
        │     ├── /:id/followers
        │     ├── /:id/following
        │     └── /:id/suggestions
        ├── /posts              → posts.js router
        │     └── /:id
        ├── /posts/:id/like     → likes.js router  (mergeParams: true)
        ├── /follow             → follows.js router
        ├── /feed/:userId       → feed.js router
        └── /suggestions/:id    → suggestions.js router
                                   (canonical path: /users/:id/suggestions)
```

---

## API Contracts

### Users

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| POST | `/api/users` | `{ username, displayName, bio?, profilePicUrl? }` | 201 user | 400 missing fields / duplicate username |
| GET | `/api/users` | — | 200 `[user]` | — |
| GET | `/api/users/:id` | — | 200 user + `{ followerCount, followingCount, postCount }` | 404 |
| GET | `/api/users/:userId/posts` | — | 200 `[post]` newest-first | 404 |
| GET | `/api/users/:id/followers` | — | 200 `[user]` | 404 |
| GET | `/api/users/:id/following` | — | 200 `[user]` | 404 |
| GET | `/api/users/:id/suggestions` | — | 200 `[user + mutualCount]` ranked | 404 |

### Posts

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| POST | `/api/posts` | `{ authorId, content, mediaType?, mediaUrl? }` | 201 post | 400 invalid authorId/content |
| GET | `/api/posts` | — | 200 `[post]` newest-first | — |
| GET | `/api/posts/:id` | — | 200 post + `{ author }` | 404 |
| DELETE | `/api/posts/:id` | — | 204 | 404 |

### Follows

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| POST | `/api/follow` | `{ followerId, followeeId }` | 201 | 400 same user / already following; 404 user not found |
| DELETE | `/api/follow` | `{ followerId, followeeId }` | 200 | 404 not following |

### Likes

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| POST | `/api/posts/:id/like` | `{ userId }` | 201 `{ userId, postId, likesCount }` | 400 already liked; 404 post/user |
| DELETE | `/api/posts/:id/like` | `{ userId }` | 200 `{ likesCount }` | 404 |
| GET | `/api/posts/:id/likes` | — | 200 `[user]` | 404 |

### Feed

| Method | Path | Success | Errors |
|---|---|---|---|
| GET | `/api/feed/:userId` | 200 `[post + author]` newest-first, followed users only | 404 |

### Suggestions

| Method | Path | Success | Errors |
|---|---|---|---|
| GET | `/api/users/:id/suggestions` | 200 `[user + mutualCount]` ranked desc | 404 |
| GET | `/api/suggestions/:id` | Same as above (alternate path) | 404 |

---

## Data Model

```js
// users: { [id: string]: User }
User {
  id:            string   // uuid
  username:      string   // unique, case-insensitive
  displayName:   string
  bio:           string
  profilePicUrl: string | null
  createdAt:     ISO8601 string
}

// posts: { [id: string]: Post }
Post {
  id:         string   // uuid
  authorId:   string   // → users[id]
  content:    string
  mediaType:  'image' | 'video' | null
  mediaUrl:   string | null
  createdAt:  ISO8601 string
  likesCount: number   // denormalised counter, kept in sync by likes routes
}

// follows: Array<{ followerId: string, followeeId: string }>
// likes:   Array<{ userId: string, postId: string }>
```

---

## Non-Functional Considerations

- **Security:** No auth on MVP — all endpoints are public. For production, add JWT middleware before route handlers.
- **Performance:** In-memory store; all operations O(n). Acceptable for demo/test; replace with DB for prod.
- **Scalability:** Single-process. The `storage` module is a singleton — works fine for one Node process. For multi-process/multi-instance, move to Redis or Postgres.
- **Testability:** `app` is exported from `server.js`; `storage.reset()` allows clean state per test. Seed is called explicitly, not on module load.
- **Data integrity:** `likesCount` is a denormalised counter on the Post object, incremented/decremented atomically within the same request handler that mutates `storage.likes`. On `DELETE /api/posts/:id`, all associated likes are purged.

---

## Route Mounting Decision

Sub-routes like `GET /api/users/:id/followers`, `/following`, `/posts`, and `/suggestions` are co-located in `routes/users.js` rather than split across files. This avoids Express param inheritance issues when mounting sub-routers and keeps the follower/following logic alongside the user entity it belongs to. The `suggestions.js` router is additionally mounted at `/api/suggestions/:id` for a clean alternate path.
