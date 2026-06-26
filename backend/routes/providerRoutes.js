const express = require('express');
const router = express.Router();
const Provider = require('../models/Provider');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// @GET /api/providers/nearby?lat=&lng=&category=&radius=
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, category, radius = 15 } = req.query;
    const filter = {
      isApproved: true,
      isAvailable: true,
      isActive: true,
    };
    if (category) {
      filter.$or = [
        { serviceCategory: category },
        { offeredServices: category }
      ];
    }
    if (lat && lng) {
      filter.location = {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseFloat(radius) * 1000,
        },
      };
    }
    let providers = await Provider.find(filter).populate('user', 'name phone avatar').limit(50);

    // Fallback: If no providers found within strict radius, fetch them regardless of location 
    // This handles providers who registered without location access (defaulted to [0,0])
    if (providers.length === 0 && filter.location) {
      delete filter.location;
      providers = await Provider.find(filter).populate('user', 'name phone avatar').limit(50);
    }

    // --- SMART RECOMMENDATION ENGINE ---
    // If lat/lng provided, calculate distance manually using Haversine to score them
    const scoredProviders = providers.map(p => {
      let distanceKm = 10; // Default distance if not calculated
      if (lat && lng && p.location?.coordinates) {
        const [pLng, pLat] = p.location.coordinates;
        const R = 6371;
        const dLat = (pLat - parseFloat(lat)) * (Math.PI/180);
        const dLng = (pLng - parseFloat(lng)) * (Math.PI/180);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(parseFloat(lat) * (Math.PI/180)) * Math.cos(pLat * (Math.PI/180)) * 
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        distanceKm = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
      }

      // Base Score Weights:
      // Rating: out of 5 (e.g. 4.8 * 20 = 96 points)
      // Experience: cap at 10 years (e.g. 5 yrs = 10 points)
      // Distance: closer is better (subtract points for being far)
      // Response Time: faster is better (subtract points for slow response)
      
      const ratingScore = (p.rating || 0) * 20;
      const expScore = Math.min(p.experience || 0, 10) * 2;
      const distancePenalty = Math.min(distanceKm, 20) * 2; // -2 pts per km
      const responsePenalty = Math.min(p.averageResponseTime || 60, 120) * 0.2; // -0.2 pts per min
      
      const smartScore = ratingScore + expScore - distancePenalty - responsePenalty;

      return {
        ...p.toObject(),
        distanceKm: distanceKm.toFixed(1),
        smartScore: smartScore.toFixed(2)
      };
    });

    // Sort by Smart Score descending
    scoredProviders.sort((a, b) => b.smartScore - a.smartScore);

    res.json({ success: true, providers: scoredProviders.slice(0, 20) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/providers — all providers (admin)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const providers = await Provider.find().populate('user', 'name email phone').sort('-createdAt');
    res.json({ success: true, providers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/providers/me — current provider profile
router.get('/me', protect, authorize('provider'), async (req, res) => {
  try {
    const provider = await Provider.findOne({ user: req.user._id }).populate('user', 'name email phone avatar');
    if (!provider) return res.status(404).json({ message: 'Provider profile not found' });
    res.json({ success: true, provider });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @PUT /api/providers/me — update provider profile
router.put('/me', protect, authorize('provider'), async (req, res) => {
  try {
    const updates = req.body;
    const provider = await Provider.findOneAndUpdate({ user: req.user._id }, updates, { new: true, runValidators: true }).populate('user', 'name email phone');
    res.json({ success: true, provider });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @PUT /api/providers/availability
router.put('/availability', protect, authorize('provider'), async (req, res) => {
  try {
    const { isAvailable } = req.body;
    await Provider.findOneAndUpdate({ user: req.user._id }, { isAvailable });
    res.json({ success: true, isAvailable });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @PUT /api/providers/:id/approve — admin approve provider
router.put('/:id/approve', protect, authorize('admin'), async (req, res) => {
  try {
    const provider = await Provider.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true }).populate('user', 'name phone');
    if (provider) {
      await User.findByIdAndUpdate(provider.user._id, { role: 'provider' });
      
      // Dispatch SMS Notification via Twilio (non-blocking)
      if (provider.user && provider.user.phone) {
        const providerPhone = provider.user.phone;
        const providerName = provider.user.name || 'Provider';
        const msg = `Congratulations ${providerName}! Your Community Help provider profile has been verified and approved by the admin. You can now receive service requests.`;
        
        const { sendProviderSMS } = require('../utils/twilioService');
        sendProviderSMS(providerPhone, msg).catch(err => console.error("Twilio SMS Background Error:", err.message));
      }
    }
    res.json({ success: true, provider });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @DELETE /api/providers/:id/reject — admin reject provider
router.delete('/:id/reject', protect, authorize('admin'), async (req, res) => {
  try {
    const provider = await Provider.findByIdAndDelete(req.params.id);
    if (!provider) return res.status(404).json({ message: 'Provider not found' });
    res.json({ success: true, message: 'Provider application rejected and deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/providers/:id
router.get('/:id', async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id).populate('user', 'name phone avatar');
    if (!provider) return res.status(404).json({ message: 'Provider not found' });
    res.json({ success: true, provider });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
