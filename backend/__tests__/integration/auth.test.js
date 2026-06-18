const request = require('supertest');
const { app } = require('../../server');
const db = require('../setup');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');

// Pass setup and teardown to Jest
beforeAll(async () => await db.connect());
afterEach(async () => await db.clearDatabase());
afterAll(async () => await db.closeDatabase());

describe('Auth API Endpoints', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          phone: '1234567890',
          password: 'password123',
          role: 'user'
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('phone', '1234567890');
    });

    it('should fail if phone number already exists', async () => {
      // Create user first
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);
      await User.create({
        name: 'Existing User',
        phone: '1234567890',
        password: hashedPassword,
        role: 'user'
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Another User',
          phone: '1234567890',
          password: 'password123',
          role: 'user'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'Email already registered');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login an existing user and return a token', async () => {
      // Setup
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);
      await User.create({
        name: 'Login User',
        phone: '0987654321',
        password: hashedPassword,
        role: 'user'
      });

      // Execute
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '0987654321',
          password: 'password123'
        });

      // Assert
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('token');
    });

    it('should fail login with incorrect password', async () => {
      // Setup
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);
      await User.create({
        name: 'Login User',
        phone: '0987654321',
        password: hashedPassword,
        role: 'user'
      });

      // Execute
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '0987654321',
          password: 'wrongpassword'
        });

      // Assert
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message', 'Invalid phone number or password');
    });
  });
});
