const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @GET /api/users/profile
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @PUT /api/users/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone, address, emergencyContacts } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, address, emergencyContacts },
      { new: true }
    );
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/users — admin: all users
router.get('/', protect, async (req, res) => {
  try {
    const users = await User.find().sort('-createdAt');
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
