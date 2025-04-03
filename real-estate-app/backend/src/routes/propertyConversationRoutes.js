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


router.get('/:propertyId/unread-count', authMiddleware, async (req, res) => {
  try {
    const { propertyId } = req.params;

    const count = await PropertyConversation.countDocuments({
      propertyId,
      type: 'reply',
      isRead: false
    });

    res.json({ unreadCount: count });
  } catch (err) {
    console.error('Unread count error:', err);
    res.status(500).json({ message: 'Failed to fetch unread email count.' });
  }
});


router.post('/:conversationId/mark-as-read', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const result = await PropertyConversation.updateOne(
      { _id: conversationId },
      { $set: { isRead: true } }
    );

    res.json({ success: true, updated: result.modifiedCount > 0 });
  } catch (err) {
    console.error('Mark as read error:', err);
    res.status(500).json({ message: 'Failed to mark as read.' });
  }
});


router.post('/:conversationId/mark-as-unread', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const result = await PropertyConversation.updateOne(
      { _id: conversationId },
      { $set: { isRead: false } }
    );

    res.json({ success: true, updated: result.modifiedCount > 0 });
  } catch (err) {
    console.error('Mark as unread error:', err);
    res.status(500).json({ message: 'Failed to mark as unread.' });
  }
});




module.exports = router;
