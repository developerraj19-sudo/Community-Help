const request = require('supertest');
const { app } = require('../../server');
const db = require('../setup');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');

// Pass setup and teardown to Jest
beforeAll(async () => await db.connect());
afterEach(async () => await db.clearDatabase());
afterAll(async () => await db.closeDatabase());

describe('Emergency API Endpoints', () => {
  let userToken;
  let userId;

  beforeEach(async () => {
    // Setup authenticated user for each test
    const user = await User.create({
      name: 'Emergency Caller',
      phone: '9999999999',
      password: 'password123',
      role: 'user'
    });
    userId = user._id;
    userToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'test_secret', { expiresIn: '1h' });
  });

  describe('POST /api/emergency/sos', () => {
    it('should successfully trigger a police SOS and calculate an ETA', async () => {
      const res = await request(app)
        .post('/api/emergency/sos')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          type: 'police',
          location: { lat: 12.9716, lng: 77.5946 }, // Bangalore coordinates
          description: 'Help, there is a robbery!'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.emergency).toHaveProperty('type', 'police');
      expect(res.body.emergency).toHaveProperty('status', 'dispatched');
      expect(res.body.emergency).toHaveProperty('etaMinutes');
      expect(res.body.emergency).toHaveProperty('assignedStation');
    });

    it('should reject SOS if user already has an active emergency of the same type', async () => {
      // First SOS
      await request(app)
        .post('/api/emergency/sos')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          type: 'ambulance',
          location: { lat: 12.9716, lng: 77.5946 }
        });

      // Second identical SOS immediately after
      const res = await request(app)
        .post('/api/emergency/sos')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          type: 'ambulance',
          location: { lat: 12.9716, lng: 77.5946 }
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'You already have an active emergency request of this type.');
    });

    it('should block unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/emergency/sos')
        .send({
          type: 'fire',
          location: { lat: 12.9716, lng: 77.5946 }
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message', 'Not authorized to access this route');
    });
  });
});
