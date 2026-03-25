process.env.JWT_SECRET = 'test_secret';
process.env.DATABASE_URL = 'postgresql://test';

jest.mock('../lib/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
}));

const request = require('supertest');
const express = require('express');
const authRouter = require('../routes/auth');
const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

beforeEach(() => jest.clearAllMocks());

describe('POST /api/auth/register', () => {
  it('creates a user and returns a token', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'nathan@example.com',
      name: 'Nathan',
    });

    const res = await request(app).post('/api/auth/register').send({
      name: 'Nathan',
      email: 'nathan@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('nathan@example.com');
  });

  it('returns 409 when email is already registered', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

    const res = await request(app).post('/api/auth/register').send({
      name: 'Nathan',
      email: 'nathan@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email already registered');
  });

  it('returns 400 when fields are missing', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'nathan@example.com',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is too short', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Nathan',
      email: 'nathan@example.com',
      password: '123',
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('returns a token for valid credentials', async () => {
    const hashed = await bcrypt.hash('password123', 10);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'nathan@example.com',
      name: 'Nathan',
      password: hashed,
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'nathan@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    const decoded = jwt.verify(res.body.token, 'test_secret');
    expect(decoded.userId).toBe('user-1');
  });

  it('returns 401 for a wrong password', async () => {
    const hashed = await bcrypt.hash('correctpassword', 10);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'nathan@example.com',
      name: 'Nathan',
      password: hashed,
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'nathan@example.com',
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
  });

  it('returns 401 when user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(401);
  });

  it('returns 400 when fields are missing', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nathan@example.com',
    });
    expect(res.status).toBe(400);
  });
});
