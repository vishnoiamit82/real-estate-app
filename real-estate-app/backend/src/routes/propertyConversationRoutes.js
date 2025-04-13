// ✅ routes/propertyConversations.js
const express = require('express');
const router = express.Router();
const PropertyConversation = require('../models/PropertyConversation');
const Property = require('../models/Property');
const Agent = require('../models/Agent');
const { authMiddleware, authorize } = require('../middlewares/authMiddleware');



router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    // Step 1: Find all properties created by this user
    const properties = await Property.find({ createdBy: userId }).lean();
    const propertyIds = properties.map(p => p._id);

    // Step 2: Fetch all conversations for those properties
    const allConversations = await PropertyConversation.find({
      propertyId: { $in: propertyIds }
    }).sort({ timestamp: -1 }).lean();

    // Step 3: Group conversations by propertyId
    const conversationMap = {};
    allConversations.forEach(log => {
      const pid = log.propertyId.toString();
      if (!conversationMap[pid]) {
        conversationMap[pid] = [];
      }
      if (conversationMap[pid].length < 5) {
        conversationMap[pid].push(log);
      }
    });

    // Step 4: Summarize latest message + unread count
    const summary = properties.map(property => {
      const logs = conversationMap[property._id.toString()] || [];
      const unreadCount = logs.filter(l => l.type === 'reply' && !l.isRead).length;

      return {
        property,
        latestMessage: logs[0] || null,
        unreadCount,
        logs
      };
    });

    res.json(summary);
  } catch (err) {
    console.error('Message summary error:', err);
    res.status(500).json({ message: 'Failed to load message summary.' });
  }
});



router.get('/feed', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const type = req.query.type === 'sent' ? 'sent' : 'reply';

    // Step 1: Find all properties created by this user
    const properties = await Property.find({ createdBy: userId }).lean();
    const agentIds = properties.map(p => p.agentId).filter(Boolean);
    const agents = await Agent.find({ _id: { $in: agentIds } }).lean();
    const agentMap = Object.fromEntries(agents.map(a => [a._id.toString(), a]));

    const propertyMap = Object.fromEntries(
      properties.map(p => [p._id.toString(), { ...p, agentId: agentMap[p.agentId?.toString()] || null }])
    );

    const propertyIds = Object.keys(propertyMap);

    // Step 2: Count total conversations for given type
    const total = await PropertyConversation.countDocuments({
      propertyId: { $in: propertyIds },
      type
    });

    // Step 3: Fetch paginated conversations sorted by latest timestamp
    const conversations = await PropertyConversation.find({
      propertyId: { $in: propertyIds },
      type
    })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const feed = conversations.map(msg => ({
      property: propertyMap[msg.propertyId.toString()],
      latestMessage: {
        ...msg,
        from: msg.from || {},
        to: msg.to || {}
      }
    }));

    res.json({
      results: feed,
      page,
      totalPages: Math.ceil(total / limit),
      totalCount: total
    });
  } catch (err) {
    console.error('Message feed error:', err);
    res.status(500).json({ message: 'Failed to load message feed.' });
  }
});



router.get('/unread-counts', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    // Find properties created by this user (or shared with them)
    const properties = await Property.find({
      $or: [
        { createdBy: userId }
        // { buyerAgentId: userId },
        // { sharedWith: userId }, // if using sharing logic
      ]
    }, '_id');

    const propertyIds = properties.map(p => p._id);

    const results = await PropertyConversation.aggregate([
      {
        $match: {
          propertyId: { $in: propertyIds },
          type: 'reply',
          isRead: false,
        },
      },
      {
        $group: {
          _id: '$propertyId',
          unreadCount: { $sum: 1 },
        },
      },
    ]);

    const unreadMap = {};
    for (const result of results) {
      unreadMap[result._id] = result.unreadCount;
    }

    res.json(unreadMap);
  } catch (err) {
    console.error('Unread count fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch unread counts.' });
  }
});



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





// router.get('/:propertyId/unread-count', authMiddleware, async (req, res) => {
//   try {
//     const { propertyId } = req.params;

//     const count = await PropertyConversation.countDocuments({
//       propertyId,
//       type: 'reply',
//       isRead: false
//     });

//     res.json({ unreadCount: count });
//   } catch (err) {
//     console.error('Unread count error:', err);
//     res.status(500).json({ message: 'Failed to fetch unread email count.' });
//   }
// });


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
