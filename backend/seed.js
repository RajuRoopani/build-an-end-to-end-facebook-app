/**
 * seed.js — Populates in-memory storage with realistic sample data.
 *
 * Creates:
 *   - 6 sample users
 *   - 9 sample posts (text, image, video mix)
 *   - 6 follow relationships (enough for meaningful suggestions)
 *   - 5 likes
 *
 * Exports a seed() function called once at server startup.
 * User IDs are exported so the frontend can reference them.
 */

const { v4: uuidv4 } = require('uuid');
const storage = require('./storage');

// Pre-defined IDs so frontend can reference specific seed users/posts
const SEED_IDS = {
  users: {
    alice: 'user-alice-0001',
    bob: 'user-bob-0002',
    carol: 'user-carol-0003',
    dave: 'user-dave-0004',
    eve: 'user-eve-0005',
    frank: 'user-frank-0006',
  },
  posts: {
    p1: 'post-0001',
    p2: 'post-0002',
    p3: 'post-0003',
    p4: 'post-0004',
    p5: 'post-0005',
    p6: 'post-0006',
    p7: 'post-0007',
    p8: 'post-0008',
    p9: 'post-0009',
  },
};

function seed() {
  const now = new Date();
  const minutesAgo = (n) => new Date(now - n * 60 * 1000).toISOString();

  // ── Users ────────────────────────────────────────────────────────────────
  const users = [
    {
      id: SEED_IDS.users.alice,
      username: 'alice',
      displayName: 'Alice Wonderland',
      bio: 'Curiouser and curiouser! 🐇',
      profilePicUrl: 'https://i.pravatar.cc/150?u=alice',
      createdAt: minutesAgo(120),
    },
    {
      id: SEED_IDS.users.bob,
      username: 'bob',
      displayName: 'Bob Builder',
      bio: 'Can we fix it? Yes we can! 🔨',
      profilePicUrl: 'https://i.pravatar.cc/150?u=bob',
      createdAt: minutesAgo(110),
    },
    {
      id: SEED_IDS.users.carol,
      username: 'carol',
      displayName: 'Carol Danvers',
      bio: 'Higher, further, faster. 🚀',
      profilePicUrl: 'https://i.pravatar.cc/150?u=carol',
      createdAt: minutesAgo(100),
    },
    {
      id: SEED_IDS.users.dave,
      username: 'dave',
      displayName: 'Dave Grohl',
      bio: 'Music is the answer 🎸',
      profilePicUrl: 'https://i.pravatar.cc/150?u=dave',
      createdAt: minutesAgo(90),
    },
    {
      id: SEED_IDS.users.eve,
      username: 'eve',
      displayName: 'Eve Online',
      bio: 'Always watching the network 👁️',
      profilePicUrl: 'https://i.pravatar.cc/150?u=eve',
      createdAt: minutesAgo(80),
    },
    {
      id: SEED_IDS.users.frank,
      username: 'frank',
      displayName: 'Frank Ocean',
      bio: 'Blonde vibes only 🌊',
      profilePicUrl: 'https://i.pravatar.cc/150?u=frank',
      createdAt: minutesAgo(70),
    },
  ];

  users.forEach((u) => {
    storage.users[u.id] = u;
  });

  // ── Posts ─────────────────────────────────────────────────────────────────
  const posts = [
    // Text-only posts
    {
      id: SEED_IDS.posts.p1,
      authorId: SEED_IDS.users.alice,
      content: 'Just had the best cup of coffee ☕ — good morning, world!',
      mediaType: null,
      mediaUrl: null,
      createdAt: minutesAgo(60),
      likesCount: 0,
    },
    {
      id: SEED_IDS.posts.p2,
      authorId: SEED_IDS.users.bob,
      content: 'Finished building a bookshelf today. Proud of myself! 💪',
      mediaType: null,
      mediaUrl: null,
      createdAt: minutesAgo(55),
      likesCount: 0,
    },
    {
      id: SEED_IDS.posts.p3,
      authorId: SEED_IDS.users.carol,
      content: 'Flying at 30,000 feet and the view is absolutely breathtaking 🌤️',
      mediaType: null,
      mediaUrl: null,
      createdAt: minutesAgo(50),
      likesCount: 0,
    },
    // Image posts
    {
      id: SEED_IDS.posts.p4,
      authorId: SEED_IDS.users.dave,
      content: 'Sunset jam session 🎸🌅',
      mediaType: 'image',
      mediaUrl: 'https://picsum.photos/seed/guitar/800/600',
      createdAt: minutesAgo(45),
      likesCount: 0,
    },
    {
      id: SEED_IDS.posts.p5,
      authorId: SEED_IDS.users.eve,
      content: 'My home lab setup — new rack arrived! 🖥️',
      mediaType: 'image',
      mediaUrl: 'https://picsum.photos/seed/server/800/600',
      createdAt: minutesAgo(40),
      likesCount: 0,
    },
    {
      id: SEED_IDS.posts.p6,
      authorId: SEED_IDS.users.frank,
      content: 'Ocean view from the studio 🌊',
      mediaType: 'image',
      mediaUrl: 'https://picsum.photos/seed/ocean/800/600',
      createdAt: minutesAgo(35),
      likesCount: 0,
    },
    // More text posts
    {
      id: SEED_IDS.posts.p7,
      authorId: SEED_IDS.users.alice,
      content: 'Reading "Alice in Wonderland" for the hundredth time. Still magical ✨',
      mediaType: null,
      mediaUrl: null,
      createdAt: minutesAgo(30),
      likesCount: 0,
    },
    // Video post
    {
      id: SEED_IDS.posts.p8,
      authorId: SEED_IDS.users.bob,
      content: 'Time-lapse of the bookshelf build 🎬',
      mediaType: 'video',
      mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      createdAt: minutesAgo(25),
      likesCount: 0,
    },
    {
      id: SEED_IDS.posts.p9,
      authorId: SEED_IDS.users.carol,
      content: 'Back on the ground. Next mission: the fridge 🍕',
      mediaType: null,
      mediaUrl: null,
      createdAt: minutesAgo(10),
      likesCount: 0,
    },
  ];

  posts.forEach((p) => {
    storage.posts[p.id] = p;
  });

  // ── Follows ───────────────────────────────────────────────────────────────
  // alice follows bob, carol, dave
  // bob follows alice, carol
  // carol follows dave
  // eve follows alice, frank
  const followRelationships = [
    { followerId: SEED_IDS.users.alice, followeeId: SEED_IDS.users.bob },
    { followerId: SEED_IDS.users.alice, followeeId: SEED_IDS.users.carol },
    { followerId: SEED_IDS.users.alice, followeeId: SEED_IDS.users.dave },
    { followerId: SEED_IDS.users.bob,   followeeId: SEED_IDS.users.alice },
    { followerId: SEED_IDS.users.bob,   followeeId: SEED_IDS.users.carol },
    { followerId: SEED_IDS.users.carol, followeeId: SEED_IDS.users.dave },
    { followerId: SEED_IDS.users.eve,   followeeId: SEED_IDS.users.alice },
    { followerId: SEED_IDS.users.eve,   followeeId: SEED_IDS.users.frank },
  ];

  followRelationships.forEach((f) => storage.follows.push(f));

  // ── Likes ─────────────────────────────────────────────────────────────────
  const likeRelationships = [
    { userId: SEED_IDS.users.bob,   postId: SEED_IDS.posts.p1 },
    { userId: SEED_IDS.users.carol, postId: SEED_IDS.posts.p1 },
    { userId: SEED_IDS.users.alice, postId: SEED_IDS.posts.p4 },
    { userId: SEED_IDS.users.eve,   postId: SEED_IDS.posts.p4 },
    { userId: SEED_IDS.users.dave,  postId: SEED_IDS.posts.p9 },
  ];

  likeRelationships.forEach(({ userId, postId }) => {
    storage.likes.push({ userId, postId });
    storage.posts[postId].likesCount += 1;
  });
}

module.exports = { seed, SEED_IDS };
