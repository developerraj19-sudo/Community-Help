const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, sparse: true, lowercase: true },
    password: { type: String, minlength: 6 },
    phone: { type: String, required: true, unique: true },
    role: { type: String, enum: ['user', 'provider', 'admin'], default: 'user' },
    avatar: { type: String, default: '' },
    address: { type: String, default: '' },
    location: {
      type: { type: String, default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    emergencyContacts: [
      {
        name: String,
        phone: String,
        relation: String,
      },
    ],
    serviceHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest' }],
  },
  { timestamps: true }
);

userSchema.index({ location: '2dsphere' });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
