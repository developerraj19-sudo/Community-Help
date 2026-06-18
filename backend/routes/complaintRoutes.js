const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const { protect, authorize } = require('../middleware/auth');

// @POST /api/complaints — file a complaint
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, category, incidentDate, lat, lng, address, evidence } = req.body;
    
    // Simulate nearest police station based on location
    const nearestStation = 'Central Police Station, MG Road';

    const complaint = await Complaint.create({
      user: req.user._id,
      title,
      description,
      category: category || 'other',
      incidentDate: incidentDate ? new Date(incidentDate) : new Date(),
      incidentLocation: {
        type: 'Point',
        coordinates: [lng || 0, lat || 0],
        address: address || '',
      },
      nearestPoliceStation: nearestStation,
      evidence: Array.isArray(evidence) ? evidence : (evidence ? [evidence] : []),
    });

    res.status(201).json({
      success: true,
      complaint,
      message: `Complaint registered. Number: ${complaint.complaintNumber}`,
      assignedStation: nearestStation,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/complaints/my
router.get('/my', protect, async (req, res) => {
  try {
    const complaints = await Complaint.find({ user: req.user._id }).sort('-createdAt');
    res.json({ success: true, complaints });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/complaints/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate('user', 'name email phone');
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    res.json({ success: true, complaint });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/complaints — admin: all complaints
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const complaints = await Complaint.find().populate('user', 'name phone').sort('-createdAt');
    res.json({ success: true, complaints });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @PUT /api/complaints/:id/status — admin: update complaint status
router.put('/:id/status', protect, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const complaint = await Complaint.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    res.json({ success: true, complaint });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
