const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Provider = require('../models/Provider');
const ServiceRequest = require('../models/ServiceRequest');
const Emergency = require('../models/Emergency');
const Complaint = require('../models/Complaint');
const { protect, authorize } = require('../middleware/auth');

// @GET /api/admin/stats
router.get('/stats', protect, authorize('admin'), async (req, res) => {
  try {
    const [totalUsers, totalProviders, totalRequests, activeEmergencies, totalComplaints] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Provider.countDocuments(),
      ServiceRequest.countDocuments(),
      Emergency.countDocuments({ status: { $in: ['active', 'dispatched'] } }),
      Complaint.countDocuments(),
    ]);

    const recentRequests = await ServiceRequest.find().sort('-createdAt').limit(5)
      .populate('user', 'name').populate({ path: 'provider', populate: { path: 'user', select: 'name' } });

    res.json({
      success: true,
      stats: { totalUsers, totalProviders, totalRequests, activeEmergencies, totalComplaints },
      recentRequests,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/admin/analytics
router.get('/analytics', protect, authorize('admin'), async (req, res) => {
  try {
    // 1. Emergency Breakdown by Type
    const emergenciesByType = await Emergency.aggregate([
      { $group: { _id: '$type', value: { $sum: 1 } } }
    ]);
    const formattedEmergencies = emergenciesByType.map(e => ({ name: e._id || 'other', value: e.value }));

    // 2. Providers by Category
    const providersByCategory = await Provider.aggregate([
      { $group: { _id: '$serviceCategory', value: { $sum: 1 } } }
    ]);
    const formattedProviders = providersByCategory.map(p => ({ name: p._id || 'unassigned', value: p.value }));

    // 3. Service Requests Timeline (Last 7 Days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const requestsByDay = await ServiceRequest.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          requests: { $sum: 1 },
          revenue: { $sum: "$amount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const formattedTimeline = requestsByDay.map(r => ({ date: r._id, requests: r.requests, revenue: r.revenue }));

    res.json({
      success: true,
      data: {
        emergencies: formattedEmergencies,
        providers: formattedProviders,
        timeline: formattedTimeline
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/admin/pending-providers
router.get('/pending-providers', protect, authorize('admin'), async (req, res) => {
  try {
    const providers = await Provider.find({ isApproved: false }).populate('user', 'name email phone');
    res.json({ success: true, providers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @PUT /api/admin/users/:id/toggle
router.put('/users/:id/toggle', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
