/**
 * MiniWall API — integration test suite
 * TCs 1–15 map directly to the coursework specification.
 * Uses mongodb-memory-server for an isolated, in-process MongoDB instance.
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app';

// ─── Test state ───────────────────────────────────────────────────────────────

let mongod: MongoMemoryServer;

// Tokens obtained in TC2
let olgaToken: string;
let nickToken: string;
let maryToken: string;

// Post IDs created in TC4–TC6
let olgaPostId: string;
let nickPostId: string;
let maryPostId: string;

// ─── Lifecycle ────────────────────────────────────────────────────────────────

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

// ─── TC1: Register three users ────────────────────────────────────────────────

describe('TC1 – Register users', () => {
  it('registers Olga with 201', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'Olga',
      email: 'olga@test.com',
      password: 'password1',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  it('registers Nick with 201', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'Nick',
      email: 'nick@test.com',
      password: 'password1',
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
  });

  it('registers Mary with 201', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'Mary',
      email: 'mary@test.com',
      password: 'password1',
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
  });
});

// ─── TC2: Login all three users ───────────────────────────────────────────────

describe('TC2 – Login users and capture tokens', () => {
  it('logs in Olga and stores token', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'olga@test.com',
      password: 'password1',
    });
    expect(res.status).toBe(200);
    olgaToken = res.body.token as string;
    expect(olgaToken).toBeDefined();
  });

  it('logs in Nick and stores token', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nick@test.com',
      password: 'password1',
    });
    expect(res.status).toBe(200);
    nickToken = res.body.token as string;
  });

  it('logs in Mary and stores token', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'mary@test.com',
      password: 'password1',
    });
    expect(res.status).toBe(200);
    maryToken = res.body.token as string;
  });
});

// ─── TC3: Unauthenticated access ──────────────────────────────────────────────

describe('TC3 – Unauthenticated GET /api/posts returns 401', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/posts');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─── TC4–TC6: Create posts ────────────────────────────────────────────────────

describe('TC4 – Olga creates a post', () => {
  it('returns 201 and stores postId', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${olgaToken}`)
      .send({ title: 'Olga Post One', description: 'This is Olgas first post on MiniWall.' });
    expect(res.status).toBe(201);
    olgaPostId = res.body.data._id as string;
    expect(olgaPostId).toBeDefined();
  });
});

describe('TC5 – Nick creates a post', () => {
  it('returns 201 and stores postId', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${nickToken}`)
      .send({ title: 'Nick Post One', description: 'This is Nicks first post on MiniWall.' });
    expect(res.status).toBe(201);
    nickPostId = res.body.data._id as string;
    expect(nickPostId).toBeDefined();
  });
});

describe('TC6 – Mary creates a post', () => {
  it('returns 201 and stores maryPostId', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${maryToken}`)
      .send({ title: 'Mary Post One', description: 'This is Marys first post on MiniWall.' });
    expect(res.status).toBe(201);
    maryPostId = res.body.data._id as string;
    expect(maryPostId).toBeDefined();
  });
});

// ─── TC7: List all posts ──────────────────────────────────────────────────────

describe('TC7 – GET /api/posts returns all 3 posts', () => {
  it('Nick sees 3 posts', async () => {
    const res = await request(app)
      .get('/api/posts')
      .set('Authorization', `Bearer ${nickToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(3);
  });

  it('Olga sees 3 posts', async () => {
    const res = await request(app)
      .get('/api/posts')
      .set('Authorization', `Bearer ${olgaToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(3);
  });
});

// ─── TC8: Add comments ────────────────────────────────────────────────────────

describe('TC8 – Nick and Olga comment on Marys post', () => {
  it('Nick comments on Marys post → 201', async () => {
    const res = await request(app)
      .post(`/api/posts/${maryPostId}/comment`)
      .set('Authorization', `Bearer ${nickToken}`)
      .send({ text: 'Great post Mary!' });
    expect(res.status).toBe(201);
  });

  it('Olga comments on Marys post → 201', async () => {
    const res = await request(app)
      .post(`/api/posts/${maryPostId}/comment`)
      .set('Authorization', `Bearer ${olgaToken}`)
      .send({ text: 'I agree, lovely post!' });
    expect(res.status).toBe(201);
  });
});

// ─── TC9: Owner cannot comment their own post ─────────────────────────────────

describe('TC9 – Mary comments her own post → 403', () => {
  it('returns 403 Forbidden', async () => {
    const res = await request(app)
      .post(`/api/posts/${maryPostId}/comment`)
      .set('Authorization', `Bearer ${maryToken}`)
      .send({ text: 'Self-comment attempt' });
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

// ─── TC10: Listing order before any likes ────────────────────────────────────

describe('TC10 – GET /api/posts: Marys post (most recent) appears first', () => {
  it('first post is Marys (no likes, reverse chronological)', async () => {
    const res = await request(app)
      .get('/api/posts')
      .set('Authorization', `Bearer ${maryToken}`);
    expect(res.status).toBe(200);
    const posts = res.body.data.posts as Array<{ _id: string }>;
    expect(posts[0]._id).toBe(maryPostId);
  });
});

// ─── TC11: Get comments for a post ───────────────────────────────────────────

describe('TC11 – GET /api/posts/:id/comments returns 2 comments', () => {
  it('returns exactly 2 comments on Marys post', async () => {
    const res = await request(app)
      .get(`/api/posts/${maryPostId}/comments`)
      .set('Authorization', `Bearer ${maryToken}`);
    expect(res.status).toBe(200);
    expect((res.body.data as unknown[]).length).toBe(2);
  });
});

// ─── TC12: Like a post ───────────────────────────────────────────────────────

describe('TC12 – Nick and Olga like Marys post', () => {
  it('Nick likes Marys post → 201', async () => {
    const res = await request(app)
      .post(`/api/posts/${maryPostId}/like`)
      .set('Authorization', `Bearer ${nickToken}`);
    expect(res.status).toBe(201);
    expect(res.body.data.likeCount).toBe(1);
  });

  it('Olga likes Marys post → 201', async () => {
    const res = await request(app)
      .post(`/api/posts/${maryPostId}/like`)
      .set('Authorization', `Bearer ${olgaToken}`);
    expect(res.status).toBe(201);
    expect(res.body.data.likeCount).toBe(2);
  });
});

// ─── TC13: Owner cannot like their own post ───────────────────────────────────

describe('TC13 – Mary likes her own post → 403', () => {
  it('returns 403 Forbidden', async () => {
    const res = await request(app)
      .post(`/api/posts/${maryPostId}/like`)
      .set('Authorization', `Bearer ${maryToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

// ─── TC14: Single post shows correct like count ───────────────────────────────

describe('TC14 – GET /api/posts/:id shows 2 likes on Marys post', () => {
  it('likes array has length 2', async () => {
    const res = await request(app)
      .get(`/api/posts/${maryPostId}`)
      .set('Authorization', `Bearer ${maryToken}`);
    expect(res.status).toBe(200);
    expect((res.body.data.likes as unknown[]).length).toBe(2);
  });
});

// ─── TC15: List posts ordered by likes ───────────────────────────────────────

describe('TC15 – GET /api/posts: Marys post is first (most likes)', () => {
  it('first post in list is Marys post with 2 likes', async () => {
    const res = await request(app)
      .get('/api/posts')
      .set('Authorization', `Bearer ${nickToken}`);
    expect(res.status).toBe(200);
    const posts = res.body.data.posts as Array<{ _id: string; likeCount: number }>;
    expect(posts[0]._id).toBe(maryPostId);
    expect(posts[0].likeCount).toBe(2);
  });
});

// ─── Bonus: Search endpoint ───────────────────────────────────────────────────

describe('Search – GET /api/search', () => {
  it('finds Marys post by title keyword', async () => {
    const res = await request(app)
      .get('/api/search?title=Mary')
      .set('Authorization', `Bearer ${nickToken}`);
    expect(res.status).toBe(200);
    const posts = res.body.data as Array<{ _id: string }>;
    expect(posts.some((p) => p._id === maryPostId)).toBe(true);
  });

  it('finds posts by owner username', async () => {
    const res = await request(app)
      .get('/api/search?owner=Nick')
      .set('Authorization', `Bearer ${maryToken}`);
    expect(res.status).toBe(200);
    const posts = res.body.data as Array<{ _id: string }>;
    expect(posts.some((p) => p._id === nickPostId)).toBe(true);
  });

  it('returns 400 when no query param supplied', async () => {
    const res = await request(app)
      .get('/api/search')
      .set('Authorization', `Bearer ${maryToken}`);
    expect(res.status).toBe(400);
  });

  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/search?title=Mary');
    expect(res.status).toBe(401);
  });
});

// ─── Bonus: Unlike endpoint ───────────────────────────────────────────────────

describe('Unlike – DELETE /api/posts/:id/like', () => {
  it('Nick unlikes Marys post → 200, likeCount drops to 1', async () => {
    const res = await request(app)
      .delete(`/api/posts/${maryPostId}/like`)
      .set('Authorization', `Bearer ${nickToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.likeCount).toBe(1);
  });
});

// ─── Bonus: Delete comment ────────────────────────────────────────────────────

describe('Delete comment – DELETE /api/posts/:id/comment/:commentId', () => {
  let commentId: string;

  it('Olga adds a comment to Nicks post → 201', async () => {
    const res = await request(app)
      .post(`/api/posts/${nickPostId}/comment`)
      .set('Authorization', `Bearer ${olgaToken}`)
      .send({ text: 'Temp comment to delete' });
    expect(res.status).toBe(201);
    commentId = res.body.data._id as string;
  });

  it('Olga deletes her own comment → 200', async () => {
    const res = await request(app)
      .delete(`/api/posts/${nickPostId}/comment/${commentId}`)
      .set('Authorization', `Bearer ${olgaToken}`);
    expect(res.status).toBe(200);
  });

  it('Mary cannot delete Olgas comment → 403', async () => {
    // First re-add the comment
    const add = await request(app)
      .post(`/api/posts/${nickPostId}/comment`)
      .set('Authorization', `Bearer ${olgaToken}`)
      .send({ text: 'Another temp comment' });
    const newCommentId = add.body.data._id as string;

    const res = await request(app)
      .delete(`/api/posts/${nickPostId}/comment/${newCommentId}`)
      .set('Authorization', `Bearer ${maryToken}`);
    expect(res.status).toBe(403);
  });
});

// ─── Bonus: Delete post ───────────────────────────────────────────────────────

describe('Delete post – DELETE /api/posts/:id', () => {
  it('non-owner cannot delete a post → 403', async () => {
    const res = await request(app)
      .delete(`/api/posts/${maryPostId}`)
      .set('Authorization', `Bearer ${nickToken}`);
    expect(res.status).toBe(403);
  });

  it('owner can delete their own post → 200', async () => {
    const res = await request(app)
      .delete(`/api/posts/${olgaPostId}`)
      .set('Authorization', `Bearer ${olgaToken}`);
    expect(res.status).toBe(200);
  });

  it('deleted post is gone → 404', async () => {
    const res = await request(app)
      .get(`/api/posts/${olgaPostId}`)
      .set('Authorization', `Bearer ${nickToken}`);
    expect(res.status).toBe(404);
  });
});
