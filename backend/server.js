const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet()); // Secure HTTP Headers
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Data Sanitization against NoSQL query injection
app.use(mongoSanitize());

// HTTP Request Logging
app.use(morgan('combined', { stream: logger.stream }));

// Rate Limiting (100 reqs per 15 mins)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use('/api', apiLimiter);

// DB Connection
if (process.env.NODE_ENV !== 'test') {
  mongoose
    .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/community-help', {
      family: 4 // Force IPv4 to prevent querySrv ECONNREFUSED on Windows
    })
    .then(() => console.log('✅ MongoDB Connected'))
    .catch((err) => console.error('MongoDB Error:', err));
}

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/providers', require('./routes/providerRoutes'));
app.use('/api/services', require('./routes/serviceRoutes'));
app.use('/api/emergency', require('./routes/emergencyRoutes'));
app.use('/api/complaints', require('./routes/complaintRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));

// Global Error Handler
app.use(errorHandler);

// Socket.io for real-time tracking
const activeProviders = {};

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('provider-location-update', (data) => {
    activeProviders[data.providerId] = {
      ...data,
      socketId: socket.id,
      lastSeen: new Date(),
    };
    // Broadcast to all connected users tracking this provider
    io.emit(`track-${data.requestId}`, data);
  });

  socket.on('join-emergency-room', (data) => {
    socket.join(`emergency-${data.emergencyId}`);
  });

  socket.on('emergency-update', (data) => {
    io.to(`emergency-${data.emergencyId}`).emit('emergency-status', data);
  });

  socket.on('new-service-request', (data) => {
    // Notify providers in the area
    io.emit('incoming-request', data);
  });

  socket.on('disconnect', () => {
    // Remove from active providers
    Object.keys(activeProviders).forEach((key) => {
      if (activeProviders[key].socketId === socket.id) {
        delete activeProviders[key];
      }
    });
    console.log('🔌 Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

module.exports = { app, server };
