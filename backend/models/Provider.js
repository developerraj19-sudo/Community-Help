const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    serviceCategory: {
      type: String,
      required: true,
      enum: ['plumber', 'electrician', 'carpenter', 'ac_repair', 'appliance_repair', 'water_tanker', 'cleaning', 'maid', 'cook', 'caretaker', 'physiotherapy', 'lab_test', 'tutor', 'company', 'organization'],
    },
    serviceType: { type: String, default: 'utility' }, // 'emergency', 'utility', 'medical', 'education', 'home'
    providerType: { type: String, enum: ['individual', 'company', 'organization'], default: 'individual' },
    // Professional Details
    experience: { type: Number, default: 0 }, // years
    about: { type: String, default: '' },
    workStyle: { type: String, default: '' },
    skills: [String],
    offeredServices: [String], // for companies/organizations that offer multiple services
    certifications: [String],
    idProof: { type: String, default: '' },
    companyLicense: { type: String, default: '' },
    // Location
    location: {
      type: { type: String, default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    serviceRadius: { type: Number, default: 10 }, // km
    // Availability
    isAvailable: { type: Boolean, default: true },
    averageResponseTime: { type: Number, default: 60 }, // minutes
    workingHours: {
      start: { type: String, default: '08:00' },
      end: { type: String, default: '20:00' },
    },
    // Ratings
    rating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
    totalJobs: { type: Number, default: 0 },
    // Charges
    hourlyRate: { type: Number, default: 0 },
    minimumCharge: { type: Number, default: 0 },
    // Status
    isApproved: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    // Bank / Payment
    bankAccount: { type: String, default: '' },
    upiId: { type: String, default: '' },
  },
  { timestamps: true }
);

providerSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Provider', providerSchema);
