const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dispatchedProvider: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider' },
    type: {
      type: String,
      required: true,
      enum: ['ambulance', 'police', 'fire'],
    },
    status: {
      type: String,
      enum: ['active', 'dispatched', 'resolved', 'cancelled'],
      default: 'active',
    },
    location: {
      type: { type: String, default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
      address: String,
    },
    description: { type: String, default: '' },
    // For police: complaint registration
    complaintNumber: { type: String, default: '' },
    assignedStation: { type: String, default: '' },
    assignedUnit: { type: String, default: '' },
    // For ambulance: hospital
    assignedHospital: { type: String, default: '' },
    etaMinutes: { type: Number, default: 0 },
    resolvedAt: { type: Date },
    notes: [
      {
        text: String,
        addedAt: { type: Date, default: Date.now },
        addedBy: String,
      },
    ],
  },
  { timestamps: true }
);

emergencySchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Emergency', emergencySchema);
