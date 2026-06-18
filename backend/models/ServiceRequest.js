const mongoose = require('mongoose');

const serviceRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider' },
    serviceCategory: { type: String, required: true },
    serviceType: { type: String, default: 'utility' },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'in-progress', 'completed', 'cancelled', 'rejected'],
      default: 'pending',
    },
    priority: { type: String, enum: ['normal', 'high', 'emergency'], default: 'normal' },
    location: {
      type: { type: String, default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
      address: String,
    },
    scheduledAt: { type: Date },
    completedAt: { type: Date },
    estimatedArrival: { type: Number }, // minutes
    amount: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String, default: '' },
    // For tracking
    providerLocation: {
      coordinates: [Number],
      updatedAt: Date,
    },
  },
  { timestamps: true }
);

serviceRequestSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);
