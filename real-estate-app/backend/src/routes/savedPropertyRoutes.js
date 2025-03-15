const express = require('express');
const router = express.Router();
const SavedProperty = require('../models/SavedProperty');
const Property = require('../models/Property');
const { authMiddleware,authorize } = require('../middlewares/authMiddleware');

// Save a community property
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { communityPropertyId } = req.body;
    const existing = await SavedProperty.findOne({
      userId: req.user._id,
      communityPropertyId
    });

    if (existing) return res.status(400).json({ message: 'Already saved.' });

    const property = await Property.findById(communityPropertyId);
    const saved = await SavedProperty.create({
      userId: req.user._id,
      communityPropertyId,
      sharedBy: property?.sharedBy
    });

    res.status(201).json(saved);
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ message: 'Failed to save property.' });
  }
});

// Get all saved properties for current user
router.get('/', authMiddleware, async (req, res) => {
    try {
      const saved = await SavedProperty.find({ userId: req.user._id })
        .populate({
          path: 'communityPropertyId',
          populate: { path: 'sharedBy', select: 'name email' }
        });
  
      // ✅ Return both property data and saved-level data
      const enriched = saved
        .filter(entry => entry.communityPropertyId) // filter nulls for safety
        .map((entry) => ({
          ...entry.communityPropertyId.toObject(),
          decisionStatus: entry.decisionStatus,
          savedId: entry._id,
          source: 'saved',
          sharedBy: entry.communityPropertyId.sharedBy,
        }));
  
      res.json(enriched);
    } catch (err) {
      console.error('Fetch error:', err);
      res.status(500).json({ message: 'Failed to fetch saved properties.' });
    }
  });
  

// backend/routes/savedPropertyRoutes.js
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
      const result = await SavedProperty.findOneAndDelete({
        _id: req.params.id,
        userId: req.user._id, // 🔐 delete only from current user's view
      });
      if (!result) return res.status(404).json({ message: "Not found" });
      res.json({ message: "Deleted from saved properties" });
    } catch (err) {
      console.error("Delete saved property error:", err);
      res.status(500).json({ message: "Server error" });
    }
  });
  


// PATCH decisionStatus on a saved property
router.patch('/:id/decision', authMiddleware, async (req, res) => {
    try {
      const { decisionStatus } = req.body;
      const updated = await SavedProperty.findByIdAndUpdate(
        req.params.id,
        { decisionStatus },
        { new: true }
      );
      if (!updated) return res.status(404).json({ message: 'Saved property not found' });
  
      res.json({ message: 'Decision status updated', savedProperty: updated });
    } catch (error) {
      console.error('Error updating decision status on saved property:', error);
      res.status(500).json({ message: 'Failed to update decision status' });
    }
  });
  

module.exports = router;
