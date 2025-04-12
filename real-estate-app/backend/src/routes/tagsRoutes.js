const express = require('express');
const router = express.Router();
const Tag = require('../models/Tags');
const { authMiddleware, authorize } = require('../middlewares/authMiddleware'); //
const TagRequest = require('../models/TagRequest'); // adjust path as needed
const sendEmail = require('../utils/sendEmail'); // adjust path
// PATCH /tags/requests/:id → approve or reject a tag request
const User = require('../models/Users'); // make sure this is imported


// GET all tags (admin only)
router.get(
  '/',
  async (req, res) => {
    try {
      const tags = await Tag.find({});
      res.status(200).json(tags);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch tags', error });
    }
  }
);



router.patch(
  '/requests/:id',
  authMiddleware,
  authorize(['edit_tags']),
  async (req, res) => {
    try {
      const { status } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status. Must be "approved" or "rejected".' });
      }

      const request = await TagRequest.findById(req.params.id);
      if (!request) {
        return res.status(404).json({ message: 'Tag request not found.' });
      }

      // Update the status
      request.status = status;
      await request.save();

      // Fetch requester (optional)
      let requester = null;
      if (request.requestedBy) {
        requester = await User.findById(request.requestedBy);
      }

      const tagName = request.name;
      const requesterName = requester?.name || 'Unknown User';
      const requesterEmail = requester?.email || null;

      const adminEmail = process.env.ADMIN_EMAIL || 'amit@propsourcing.com.au';

      // ✅ Email to admin
      await sendEmail({
        to: adminEmail,
        subject: `📢 Tag "${tagName}" has been ${status}`,
        html: `
          <p>The tag request <strong>${tagName}</strong> has been <strong>${status}</strong>.</p>
          <p>Requester: ${requesterName}${requesterEmail ? ` (${requesterEmail})` : ''}</p>
        `,
      });

      // ✅ Email to requester
      if (requesterEmail) {
        const userMsg =
          status === 'approved'
            ? `Your tag request for "${tagName}" has been approved and is now live.`
            : `Your tag request for "${tagName}" has been reviewed and was not approved at this time.`;

        await sendEmail({
          to: requesterEmail,
          subject: `📝 Tag request "${tagName}" ${status}`,
          html: `
            <p>Hi ${requesterName},</p>
            <p>${userMsg}</p>
            <p>Thanks for your contribution!</p>
          `,
        });
      }

      res.status(200).json({ message: `Tag request ${status}`, request });
    } catch (error) {
      console.error('❌ Error updating tag request:', error);
      res.status(500).json({ message: 'Failed to update tag request', error });
    }
  }
);



// GET all tag requests (admin only)
router.get(
  '/requests',
  authMiddleware,
  authorize(['edit_tags']),
  async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access only' });
      }

      const requests = await TagRequest.find()
        .sort({ createdAt: -1 })
        .populate('requestedBy', 'name email'); // 💡 only pull name & email

      res.json(requests);
    } catch (err) {
      console.error('Failed to fetch tag requests:', err);
      res.status(500).json({ message: 'Error fetching tag requests.' });
    }
  }
);



// POST a new tag (admin only)
router.post(
  '/',
  (req, res, next) => {
    req.route.settings = { permissions: ['edit_tags'] };
    next();
  },
  authMiddleware,
  authorize(['edit_tags']),
  async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access only' });
      }

      const { name, type } = req.body;

      // ✅ Check if tag with same name and type already exists
      const existingTag = await Tag.findOne({ name: name.trim(), type });

      if (existingTag) {
        return res.status(409).json({ message: 'Tag with same name and type already exists', tag: existingTag });
      }

      // ✅ Create new tag if not exists
      const newTag = new Tag({ name: name.trim(), type });
      await newTag.save();

      res.status(201).json(newTag);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create tag', error });
    }
  }
);


// POST /tags/request
router.post('/request', authMiddleware, async (req, res) => {
  try {
    const { name, placement } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: 'Tag name is required and must be at least 2 characters.' });
    }

    const trimmedName = name.trim();

    // Check if tag already exists in main Tag collection
    const existingTag = await Tag.findOne({ name: trimmedName });
    if (existingTag) {
      return res.status(409).json({
        code: 'already_approved',
        message: 'This tag already exists and is approved. Please select it from the list.'
      });
    }

    // Check if request already exists
    const existingRequest = await TagRequest.findOne({ name: trimmedName, status: 'pending' });
    if (existingRequest) {
      return res.status(409).json({
        code: 'request_pending',
        message: 'Tag request already submitted and is pending review.'
      });
    }

    const newRequest = new TagRequest({
      name: trimmedName,
      placement: placement || 'unknown',
      requestedBy: req.user?._id || null,
    });

    await newRequest.save();

    const userEmail = req.user?.email || 'Unknown User';
    const userName = req.user?.name || 'Unknown User';
    const userId = req.user?._id || 'Unknown User';

    // ✅ Email to Admin
    await sendEmail({
      to: process.env.ADMIN_EMAIL || 'amit@propsourcing.com.au',
      subject: `🆕 New Tag Request: "${trimmedName}"`,
      text: `A new tag "${trimmedName}" has been requested by ${userName} (${userEmail}, ID: ${userId})`,
      html: `
        <p><strong>New Tag Requested</strong></p>
        <p>📌 <strong>Tag:</strong> <code>${trimmedName}</code></p>
        <p>🙋‍♂️ <strong>Requested by:</strong></p>
        <ul>
          <li><strong>Name:</strong> ${userName}</li>
          <li><strong>Email:</strong> ${userEmail}</li>
          <li><strong>User ID:</strong> ${userId}</li>
        </ul>
        <p>🛠️ Visit your admin panel to review and approve the tag.</p>
      `
    });

    // ✅ Email to Requester
    await sendEmail({
      to: userEmail,
      subject: `✅ Tag request submitted: "${trimmedName}"`,
      text: `Hi ${userName},\n\nYour tag request for "${trimmedName}" has been received and is pending admin approval.`,
      html: `
        <p>Hi ${userName},</p>
        <p>Thanks for submitting a tag request for <strong>${trimmedName}</strong>.</p>
        <p>Our team will review it shortly. You’ll be notified once it's approved or rejected.</p>
        <p>🙌 Thanks for contributing!</p>
      `
    });

    res.status(201).json({ message: 'Tag request submitted successfully.', request: newRequest });
  } catch (error) {
    console.error('Error requesting tag:', error);
    res.status(500).json({ message: 'Failed to submit tag request.', error });
  }
});




// PUT update tag
router.put(
  '/:id',
  (req, res, next) => {
    req.route.settings = { permissions: ['edit_tags'] };
    next();
  },
  authMiddleware,
  authorize(['edit_tags']),
  async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access only' });
      }

      const { name, type } = req.body;
      const updated = await Tag.findByIdAndUpdate(req.params.id, { name, type }, { new: true });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update tag', error });
    }
  }
);

// DELETE tag
router.delete(
  '/:id',
  (req, res, next) => {
    req.route.settings = { permissions: ['edit_tags'] };
    next();
  },
  authMiddleware,
  authorize(['edit_tags']),
  async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access only' });
      }

      await Tag.findByIdAndDelete(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete tag', error });
    }
  }
);

module.exports = router;
