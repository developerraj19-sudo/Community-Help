const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    complaintNumber: { type: String, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['theft', 'assault', 'fraud', 'accident', 'missing_person', 'domestic_violence', 'cybercrime', 'other'],
      default: 'other',
    },
    status: {
      type: String,
      enum: ['submitted', 'under_review', 'investigating', 'resolved', 'closed', 'processed'],
      default: 'submitted',
    },
    incidentLocation: {
      type: { type: String, default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
      address: String,
    },
    nearestPoliceStation: { type: String, default: '' },
    assignedOfficer: { type: String, default: '' },
    evidence: [String], // file URLs
    incidentDate: { type: Date },
    updates: [
      {
        message: String,
        updatedAt: { type: Date, default: Date.now },
        updatedBy: String,
      },
    ],
  },
  { timestamps: true }
);

complaintSchema.index({ incidentLocation: '2dsphere' });

// Auto-generate complaint number
complaintSchema.pre('save', async function (next) {
  if (!this.complaintNumber) {
    const count = await mongoose.model('Complaint').countDocuments();
    this.complaintNumber = `CMP${Date.now().toString().slice(-6)}${count + 1}`;
  }
  next();
});

module.exports = mongoose.model('Complaint', complaintSchema);
