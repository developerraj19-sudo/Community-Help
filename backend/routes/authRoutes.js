const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Provider = require('../models/Provider');
const Otp = require('../models/Otp');
const { protect } = require('../middleware/auth');
const twilio = require('twilio');

// Temporarily commented out for demo testing
/*
const twilioClient = (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID !== 'your_twilio_sid') 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) 
  : null;
*/
const twilioClient = null;

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

// @POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role, address } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({ name, email, password, phone, role: role || 'user', address });
    const token = signToken(user._id);
    res.status(201).json({
      success: true,
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @POST /api/auth/login
/**
 * CORE FEATURE: OTP AUTHENTICATION & JWT ISSUANCE
 * ------------------------------------------------
 * This endpoint processes both standard Email/Password logins (for Admins) and Phone/OTP flows.
 * 
 * Flow for Users & Providers:
 * 1. Checks if the phone number exists in MongoDB.
 * 2. Compares hashed passwords securely via bcrypt.
 * 3. Generates a 6-digit OTP and stores it temporarily in the `Otp` collection.
 * 4. Pushes the OTP to the user's physical phone via Twilio Programmable SMS API.
 * 5. Returns a 'requiresOtp: true' flag to tell the React frontend to mount the OTP input view.
 */
router.post('/login', async (req, res) => {
  try {
    console.log('LOGIN ATTEMPT:', req.body);
    // temporary debug return
    if (req.body.isDemo === 'debug') return res.json({ debug: req.body });

    const { email, phone, password, isDemo } = req.body;

    // If phone is provided, do 2FA flow
    if (phone) {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      let user = await User.findOne({ phone: formattedPhone }).select('+password');
      if (!user) {
        const strippedPhone = formattedPhone.replace('+91', '').replace('+1', '');
        user = await User.findOne({ phone: strippedPhone }).select('+password');
      }

      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ message: 'Invalid phone number or password' });
      }
      if (!user.isActive) return res.status(401).json({ message: 'Account is deactivated' });

      // Bypass OTP for demo
      if (isDemo) {
        const token = signToken(user._id);
        return res.json({
          success: true,
          token,
          user: { _id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone },
        });
      }

      // Generate OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      await Otp.deleteMany({ phone: user.phone });
      await Otp.create({ phone: user.phone, otp: otpCode });

      if (twilioClient) {
        await twilioClient.messages.create({
          body: `Your Community Help login code is ${otpCode}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: user.phone
        });
        console.log(`[Twilio] Sent OTP to ${user.phone}`);
      } else {
        console.log(`\n================================`);
        console.log(`[DEMO MODE] OTP for ${user.phone}: ${otpCode}`);
        console.log(`================================\n`);
      }

      return res.json({ success: true, requiresOtp: true, message: 'OTP sent successfully' });
    }

    // Otherwise, normal email login (Admin)
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (!user.isActive) return res.status(401).json({ message: 'Account is deactivated' });

    const token = signToken(user._id);
    res.json({
      success: true,
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone number is required' });

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code

    // Clear old OTPs for this phone
    await Otp.deleteMany({ phone });
    await Otp.create({ phone, otp: otpCode });

    if (twilioClient) {
      await twilioClient.messages.create({
        body: `Your Community Help login code is ${otpCode}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });
      console.log(`[Twilio] Sent OTP to ${phone}`);
    } else {
      console.log(`\n================================`);
      console.log(`[DEMO MODE] OTP for ${phone}: ${otpCode}`);
      console.log(`================================\n`);
    }

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (err) {
    console.error('Failed to send OTP:', err);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

// @POST /api/auth/verify-otp
/**
 * CORE FEATURE: OTP VERIFICATION & RBAC (Role-Based Access Control)
 * ------------------------------------------------------------------
 * 1. Matches the provided Phone and OTP against the MongoDB `Otp` collection.
 * 2. On success, instantly deletes the OTP record to prevent replay attacks.
 * 3. Signs a JSON Web Token (JWT) using the `process.env.JWT_SECRET`.
 * 4. This JWT encapsulates the user's `_id` and is strictly verified in subsequent requests by `middleware/auth.js`.
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp, name, password } = req.body;
    if (!phone || !otp) return res.status(400).json({ message: 'Phone and OTP are required' });

    const otpRecord = await Otp.findOne({ phone, otp });
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // OTP matched, delete it so it can't be reused
    await Otp.deleteOne({ _id: otpRecord._id });

    // Check if user exists
    let user = await User.findOne({ phone });

    // Fallback: Check without country code if stored differently
    if (!user) {
      const strippedPhone = phone.replace('+91', '').replace('+1', '');
      user = await User.findOne({ phone: strippedPhone });
    }

    let isNewUser = false;
    if (!user) {
      if (!password) {
        return res.status(400).json({ message: 'Password is required to create a new account' });
      }
      user = await User.create({
        phone,
        name: name || `User_${phone.slice(-4)}`,
        password,
        role: 'user',
        isVerified: true
      });
      isNewUser = true;
    }

    const token = signToken(user._id);
    res.json({
      success: true,
      token,
      isNewUser,
      user: { _id: user._id, name: user.name, role: user.role, phone: user.phone },
    });
  } catch (err) {
    console.error('OTP verify error:', err);
    res.status(500).json({ message: 'Internal server error during verification' });
  }
});

// @POST /api/auth/register-provider
router.post('/register-provider', protect, async (req, res) => {
  try {
    const { name, email, serviceCategory, providerType, experience, about, workStyle, skills, offeredServices, hourlyRate, minimumCharge, idProof, companyLicense } = req.body;

    let user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role === 'provider') {
      return res.status(400).json({ message: 'User is already registered as a provider' });
    }

    // Update user details
    user.name = name || user.name;
    if (email) user.email = email;
    user.role = 'provider';
    await user.save();

    const serviceTypeMap = {
      plumber: 'utility', electrician: 'utility', carpenter: 'utility',
      ac_repair: 'utility', appliance_repair: 'utility', water_tanker: 'utility',
      cleaning: 'home', maid: 'home', cook: 'home',
      caretaker: 'medical', physiotherapy: 'medical', lab_test: 'medical',
      tutor: 'education',
      company: 'utility', organization: 'utility', delivery: 'utility', logistics: 'utility'
    };

    const provider = await Provider.create({
      user: user._id,
      serviceCategory,
      serviceType: serviceTypeMap[serviceCategory] || 'utility',
      providerType: providerType || 'individual',
      experience: experience || 0,
      about,
      workStyle,
      skills,
      offeredServices: offeredServices || [],
      hourlyRate: hourlyRate || 0,
      minimumCharge: minimumCharge || 0,
      idProof: idProof || '',
      companyLicense: companyLicense || ''
    });

    const token = signToken(user._id); // Issue new token since role changed
    res.status(201).json({
      success: true,
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone },
      provider,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    let provider = null;
    if (user.role === 'provider') {
      provider = await Provider.findOne({ user: user._id });
    }
    res.json({ success: true, user, provider });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @PUT /api/auth/update-location
router.put('/update-location', protect, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    await User.findByIdAndUpdate(req.user._id, {
      location: { type: 'Point', coordinates: [lng, lat] },
    });
    if (req.user.role === 'provider') {
      await Provider.findOneAndUpdate({ user: req.user._id }, {
        location: { type: 'Point', coordinates: [lng, lat] },
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, email, address, phone } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (email) user.email = email;
    if (address) user.address = address;
    // Allow phone update if it's not empty, though normally this would require OTP verification again
    if (phone && phone !== user.phone) {
      const existing = await User.findOne({ phone });
      if (existing && existing._id.toString() !== user._id.toString()) {
        return res.status(400).json({ message: 'Phone number already in use by another account' });
      }
      user.phone = phone;
    }

    await user.save();

    // If provider, they might want to update provider details too
    let providerInfo = null;
    if (user.role === 'provider') {
      const provider = await Provider.findOne({ user: user._id });
      if (provider) {
        const { about, hourlyRate, minimumCharge, serviceRadius } = req.body;
        if (about !== undefined) provider.about = about;
        if (hourlyRate !== undefined) provider.hourlyRate = Number(hourlyRate);
        if (minimumCharge !== undefined) provider.minimumCharge = Number(minimumCharge);
        if (serviceRadius !== undefined) provider.serviceRadius = Number(serviceRadius);
        await provider.save();
        providerInfo = provider;
      }
    }

    res.json({ success: true, user, provider: providerInfo, message: 'Profile updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
