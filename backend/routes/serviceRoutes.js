const express = require('express');
const router = express.Router();
const ServiceRequest = require('../models/ServiceRequest');
const Provider = require('../models/Provider');
const { protect, authorize } = require('../middleware/auth');
const { db } = require('../config/firebase');

// @POST /api/services/request
/**
 * CORE FEATURE: UTILITY SERVICE PROVIDER MATCHING & ASSIGNMENT
 * ------------------------------------------------------------
 * This endpoint handles the complex "Bipartite Matching" of a User requesting a Service,
 * and the optimal Service Provider in the vicinity.
 * 
 * If a user manually selects a provider, it assigns them. If they request the "nearest",
 * it executes a weighted matchmaking algorithm:
 * 1. MongoDB Geospatial ($near) queries to find active providers within 15km.
 * 2. AI Prompt analysis to determine the severity/urgency of the task.
 * 3. Dynamic Utility Curve generation: calculates Haversine distance, checks current workload, speed, rating, and cost.
 * 4. Ranks all candidates and assigns the absolute best provider mathematically.
 */
router.post('/request', protect, async (req, res) => {
  try {
    const { providerId, serviceCategory, description, lat, lng, address, scheduledAt } = req.body;
    
    // Prevent duplicate active requests for the same service category
    const existingActive = await ServiceRequest.findOne({
      user: req.user._id,
      serviceCategory,
      status: { $in: ['pending', 'accepted', 'in-progress'] }
    });

    if (existingActive) {
      return res.status(400).json({ message: `You already have an active request for ${serviceCategory.replace('_', ' ')}.` });
    }

    let assignedProviderId = providerId;

    // Auto-assign to optimal provider if none selected using AI Utility Curve
    if (!assignedProviderId && lat && lng) {
      const nearbyProviders = await Provider.find({
        serviceCategory,
        isAvailable: true,
        isApproved: true,
        isActive: true,
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
            $maxDistance: 15000 // 15 km radius
          }
        }
      });
      
      if (nearbyProviders.length === 0) {
        return res.status(404).json({ message: `No available ${serviceCategory.replace('_', ' ')} providers found nearby.` });
      }

      // 1. Calculate severity using AI Dispatch
      const { analyzeSeverity } = require('../utils/aiDispatch');
      const severity = await analyzeSeverity(description, serviceCategory);

      // 2. Define Utility Curve Weights based on severity
      // CORE LOGIC: Based on how urgent the AI determines the task, the algorithm shifts its weighting.
      // Critical (e.g. major pipe burst) heavily weights Distance/Workload over Cost.
      // Low (e.g. routine AC cleaning) heavily weights Rating and Cost over Distance.
      let wDistance, wWorkload, wSpeed, wRating, wCost;
      if (severity === 4) { // Critical
        wDistance = 0.6; wWorkload = 0.3; wSpeed = 0.1; wRating = 0.0; wCost = 0.0;
      } else if (severity === 3) { // High
        wDistance = 0.4; wWorkload = 0.2; wSpeed = 0.2; wRating = 0.1; wCost = 0.1;
      } else if (severity === 2) { // Medium
        wDistance = 0.2; wWorkload = 0.1; wSpeed = 0.1; wRating = 0.3; wCost = 0.3;
      } else { // Low
        wDistance = 0.1; wWorkload = 0.1; wSpeed = 0.0; wRating = 0.4; wCost = 0.4;
      }

      // 3. Pre-calculate workloads for each provider
      const providerWorkloads = await Promise.all(nearbyProviders.map(async (p) => {
        const count = await ServiceRequest.countDocuments({
          provider: p._id,
          status: { $in: ['pending', 'accepted', 'in-progress'] }
        });
        return { providerId: p._id, count };
      }));

      const workloadsMap = providerWorkloads.reduce((acc, curr) => {
        acc[curr.providerId] = curr.count;
        return acc;
      }, {});

      // 4. Calculate Match Scores
      let bestProvider = null;
      let maxScore = -Infinity;

      for (const p of nearbyProviders) {
        // Distance Score
        const R = 6371; // km
        const dLat = (p.location.coordinates[1] - lat) * Math.PI / 180;
        const dLng = (p.location.coordinates[0] - lng) * Math.PI / 180;
        const a = Math.sin(dLat/2)*Math.sin(dLat/2) +
                  Math.cos(lat*Math.PI/180) * Math.cos(p.location.coordinates[1]*Math.PI/180) *
                  Math.sin(dLng/2)*Math.sin(dLng/2);
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const normDistance = Math.max(0, 1 - (dist / 15)); // normalize to 15km
        
        // Workload Score
        const workload = workloadsMap[p._id] || 0;
        const normWorkload = Math.max(0, 1 - (workload / 5)); // assume >5 is full

        // Speed Score
        const respTime = p.averageResponseTime || 60;
        const normSpeed = Math.max(0, 1 - (respTime / 120)); // normalize to 120 mins

        // Rating Score
        const normRating = (p.rating || 0) / 5;

        // Cost Score
        const cost = p.hourlyRate || 500;
        const normCost = Math.max(0, 1 - (cost / 2000)); // normalize to 2000 Rs

        // Final Utility Score
        const score = (wDistance * normDistance) +
                      (wWorkload * normWorkload) +
                      (wSpeed * normSpeed) +
                      (wRating * normRating) +
                      (wCost * normCost);

        if (score > maxScore) {
          maxScore = score;
          bestProvider = p;
        }
      }

      assignedProviderId = bestProvider ? bestProvider._id : nearbyProviders[0]._id;
    }

    const request = await ServiceRequest.create({
      user: req.user._id,
      provider: assignedProviderId || undefined,
      serviceCategory,
      description,
      location: { type: 'Point', coordinates: [lng || 0, lat || 0], address: address || '' },
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    });

    // Mirror tracking to Firestore
    await db.collection('service_tracking').doc(request._id.toString()).set({
      status: 'pending',
      user: req.user._id.toString(),
      provider: assignedProviderId ? assignedProviderId.toString() : null,
      updatedAt: new Date()
    });

    await request.populate([{ path: 'user', select: 'name phone' }, { path: 'provider', populate: { path: 'user', select: 'name phone' } }]);

    // Dispatch SMS Notification via Twilio (non-blocking)
    if (request.provider && request.provider.user && request.provider.user.phone) {
      const providerPhone = request.provider.user.phone;
      const userName = request.user.name || 'A user';
      const cleanCategory = serviceCategory.replace('_', ' ');
      const msg = `New Service Request! ${userName} needs a ${cleanCategory} at ${address || 'their location'}. Please check your Community Help app to accept.`;
      
      const { sendProviderSMS } = require('../utils/twilioService');
      sendProviderSMS(providerPhone, msg).catch(err => console.error("Twilio SMS Background Error:", err.message));
    }

    res.status(201).json({ success: true, request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/services/my — user's service requests
router.get('/my', protect, async (req, res) => {
  try {
    const requests = await ServiceRequest.find({ user: req.user._id })
      .populate({ path: 'provider', populate: { path: 'user', select: 'name phone avatar' } })
      .sort('-createdAt');
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/services/provider-requests — provider's incoming requests
router.get('/provider-requests', protect, authorize('provider'), async (req, res) => {
  try {
    const provider = await Provider.findOne({ user: req.user._id });
    if (!provider) return res.status(404).json({ message: 'Provider profile not found' });
    const requests = await ServiceRequest.find({ provider: provider._id })
      .populate('user', 'name phone avatar location')
      .sort('-createdAt');
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @PUT /api/services/:id/status
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status, amount } = req.body;
    const update = { status };
    if (amount) update.amount = amount;
    if (status === 'completed') update.completedAt = new Date();
    const request = await ServiceRequest.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('user', 'name phone')
      .populate({ path: 'provider', populate: { path: 'user', select: 'name phone' } });
      
    // Update tracking in Firestore
    await db.collection('service_tracking').doc(request._id.toString()).update({
      status: status,
      updatedAt: new Date()
    });

    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @POST /api/services/:id/rate
router.post('/:id/rate', protect, async (req, res) => {
  try {
    const { rating, review } = req.body;
    const request = await ServiceRequest.findByIdAndUpdate(req.params.id, { rating, review }, { new: true });
    // Update provider rating
    if (request.provider) {
      const provider = await Provider.findById(request.provider);
      if (provider) {
        const newTotal = provider.totalRatings + 1;
        const newRating = (provider.rating * provider.totalRatings + rating) / newTotal;
        await Provider.findByIdAndUpdate(provider._id, { rating: newRating, totalRatings: newTotal });
      }
    }
    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/services — admin: all requests
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const requests = await ServiceRequest.find()
      .populate('user', 'name phone')
      .populate({ path: 'provider', populate: { path: 'user', select: 'name' } })
      .sort('-createdAt').limit(100);
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
