// routes/adminQueries.js
const express = require('express');
const router = express.Router();
const AISearchQuery = require('../models/AISearchQuery');
const { authMiddleware,authorize } = require('../middlewares/authMiddleware'); // Ensure you have this middleware

router.get('/', authMiddleware, async (req, res) => {
    
  try {

    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }
      
    const recentQueries = await AISearchQuery
      .find({})
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    res.json({ queries: recentQueries });
  } catch (err) {
    console.error('Error fetching search queries:', err);
    res.status(500).json({ message: 'Failed to fetch AI search queries' });
  }
});

module.exports = router;
