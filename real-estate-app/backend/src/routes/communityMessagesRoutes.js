// routes/communityMessages.js
const express = require('express');
const router = express.Router();
const ChatThread = require('../models/ChatThread');
const Property = require('../models/Property');
const { authMiddleware } = require('../middlewares/authMiddleware');
const User = require('../models/Users');
const { sendAnonNotificationEmail } = require('../utils/sendAnonymousMessageEmail');

// ✅ GET all threads for the poster (must be logged in)
router.get('/my-threads', authMiddleware, async (req, res) => {
    try {
        const threads = await ChatThread.find({
            poster: req.user._id,
            isArchived: false
          }).populate('property').sort({ lastMessageTimestamp: -1 });
          
        res.json(threads);
    } catch (error) {
        console.error('Error fetching threads:', error);
        res.status(500).json({ error: 'Failed to fetch threads' });
    }
});

// ✅ POST create thread (or return existing) + first message
router.post('/start', authMiddleware, async (req, res) => {
    const { propertyId, message } = req.body;
    const viewerId = req.user._id;
  
    try {
      const property = await Property.findById(propertyId);

      console.log('Loaded property:', property);
      console.log('Authenticated user:', req.user);


      if (!property || !property.isCommunityShared) {
        return res.status(404).json({ error: 'Property not found or not public' });
      }
  
      let thread = await ChatThread.findOne({ property: propertyId, viewer: viewerId });
      if (!thread) {
        thread = new ChatThread({
          propertyId: propertyId,
          posterId: property.createdBy,
          viewerId: viewerId,
          viewerAlias: `Viewer-${Math.floor(Math.random() * 100000)}`,
          messages: [],
        });
      }
  
      thread.messages.push({
        senderType: 'viewer',
        content: message,
        timestamp: new Date()
      });
  
      thread.posterHasUnread = true; // ✅ notify poster of new message
      thread.viewerHasUnread = false; // viewer just sent this message

      thread.lastMessage = message;
      thread.lastMessageTimestamp = new Date();

  
  
      await thread.save();
  
      res.json(thread);
    } catch (error) {
      console.error('Error starting thread:', error);
      res.status(500).json({ error: 'Failed to start thread' });
    }
  });
  

// ✅ POST reply to thread (by poster or viewer)
router.post('/:threadId/reply', authMiddleware, async (req, res) => {
    const { threadId } = req.params;
    const { message } = req.body;
  
    try {
      const thread = await ChatThread.findById(threadId);
      if (!thread) return res.status(404).json({ error: 'Thread not found' });
  
      const isPoster = req.user._id.toString() === thread.posterId.toString();
      const isViewer = req.user._id.toString() === thread.viewerId.toString();
      
  
      if (!isPoster && !isViewer) return res.status(403).json({ error: 'Unauthorized' });
  
      thread.messages.push({
        senderType: isPoster ? 'poster' : 'viewer',
        content: message,
        timestamp: new Date()
      });
  
      // ✅ Set unread flags
      if (isPoster) {
        thread.viewerHasUnread = true;
      } else {
        thread.posterHasUnread = true;
      }

      thread.lastMessage = message;
      thread.lastMessageTimestamp = new Date();

  
      await thread.save();
  
      res.json(thread);
    } catch (error) {
      console.error('Error sending reply:', error);
      res.status(500).json({ error: 'Failed to send reply' });
    }
  });
  

// ✅ GET thread by ID (authorized only for poster or viewer)
router.get('/:threadId', authMiddleware, async (req, res) => {
    try {
        const thread = await ChatThread.findById(req.params.threadId).populate('property');
        if (!thread) return res.status(404).json({ error: 'Thread not found' });

        const isPoster = req.user._id.toString() === thread.poster.toString();
        const isViewer = req.user._id.toString() === thread.viewer.toString();

        if (!isPoster && !isViewer) return res.status(403).json({ error: 'Unauthorized' });

        res.json(thread);
    } catch (error) {
        console.error('Error fetching thread:', error);
        res.status(500).json({ error: 'Failed to fetch thread' });
    }
});


// POST /threads/:id/read → mark messages as read
router.post('/:threadId/read', authMiddleware, async (req, res) => {
    try {
      const { threadId } = req.params;
      const thread = await ChatThread.findById(threadId);
      if (!thread) return res.status(404).json({ error: 'Thread not found' });
  
      const userId = req.user._id.toString();
      const isPoster = userId === thread.poster.toString();
      const isViewer = userId === thread.viewer.toString();
  
      if (!isPoster && !isViewer) return res.status(403).json({ error: 'Unauthorized' });
  
      if (isPoster) thread.posterHasUnread = false;
      if (isViewer) thread.viewerHasUnread = false;
  
      await thread.save();
      res.json({ success: true });
    } catch (err) {
      console.error('Error marking messages as read:', err);
      res.status(500).json({ error: 'Failed to mark as read' });
    }
  });

  // DELETE /threads/:id → archive chat thread
router.delete('/:threadId', authMiddleware, async (req, res) => {
    try {
      const { threadId } = req.params;
      const thread = await ChatThread.findById(threadId);
      if (!thread) return res.status(404).json({ error: 'Thread not found' });
  
      const userId = req.user._id.toString();
      const isPoster = userId === thread.poster.toString();
      const isViewer = userId === thread.viewer.toString();
  
      if (!isPoster && !isViewer) return res.status(403).json({ error: 'Unauthorized' });
  
      thread.isArchived = true;
      await thread.save();
  
      res.json({ success: true });
    } catch (err) {
      console.error('Error archiving thread:', err);
      res.status(500).json({ error: 'Failed to archive thread' });
    }
  });
  

  
module.exports = router;