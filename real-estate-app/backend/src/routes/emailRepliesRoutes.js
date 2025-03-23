const express = require('express');
const multer = require('multer');
const upload = multer(); // no storage needed for now
const router = express.Router();
const PropertyConversation = require('../models/PropertyConversation');

router.post('/', upload.any(), async (req, res) => {
  try {
    const parsedFields = {};
    req.body.forEach((field, index) => {
      // SendGrid sends it as field: value pairs
      parsedFields[field.fieldname] = field.buffer?.toString('utf8') || '';
    });

    const from = parsedFields.from;
    const to = parsedFields.to;
    const subject = parsedFields.subject;
    const html = parsedFields.html;
    const text = parsedFields.text;

    console.log('✅ Parsed Fields:', parsedFields);

    // Extract propertyId from hidden footer in html or text
    let propertyId = null;
    const htmlMatch = html?.match(/\[ref:propertyId=([a-zA-Z0-9]+)\]/i);
    if (htmlMatch) propertyId = htmlMatch[1];
    if (!propertyId && text) {
      const textMatch = text.match(/\[ref:propertyId=([a-zA-Z0-9]+)\]/i);
      if (textMatch) propertyId = textMatch[1];
    }

    if (!propertyId) {
      console.warn('❌ Unable to extract Property ID from reply.');
      return res.status(400).json({ message: 'Property ID not found in reply.' });
    }

    const newConversation = new PropertyConversation({
      propertyId,
      type: 'email_reply',
      from,
      to,
      subject,
      content: html || text,
      timestamp: new Date(),
    });

    await newConversation.save();

    console.log('✅ Saved conversation reply:', { propertyId, subject });
    res.status(200).send('Reply recorded.');
  } catch (err) {
    console.error('❌ Failed to process multipart email reply:', err);
    res.status(500).send('Server error while processing reply');
  }
});


// Fetch email replies for a specific email
router.get('/email-replies', async (req, res) => {
    try {
        const { to } = req.query; // Get the recipient's email from the query parameter

        if (!to) {
            return res.status(400).json({ error: 'Recipient email (to) is required' });
        }

        const replies = await EmailReply.find({ to }).sort({ receivedAt: -1 }); // Get latest replies
        res.json(replies);
    } catch (error) {
        console.error('Error fetching email replies:', error);
        res.status(500).json({ error: 'Failed to fetch email replies' });
    }
});


module.exports = router;
