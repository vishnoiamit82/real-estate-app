// ✅ routes/propertyConversations.js
const express = require('express');
const router = express.Router();
const PropertyConversation = require('../models/PropertyConversation');
const { authMiddleware,authorize } = require('../middlewares/authMiddleware'); 

// GET all conversations for a property
router.get('/:propertyId', authMiddleware, async (req, res) => {
  try {
    const messages = await PropertyConversation.find({ propertyId: req.params.propertyId })
      .sort({ timestamp: -1 });
    res.json(messages);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch property conversations.' });
  }
});

// POST a new conversation log
router.post('/', authMiddleware, async (req, res) => {
  try {
    const newLog = new PropertyConversation({
      ...req.body,
      createdBy: req.user._id
    });
    await newLog.save();
    res.status(201).json(newLog);
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ message: 'Failed to save conversation.' });
  }
});

module.exports = router;
