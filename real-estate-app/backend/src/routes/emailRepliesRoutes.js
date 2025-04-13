const express = require('express');
const multer = require('multer');
const upload = multer(); // no storage needed for now
const router = express.Router();
const PropertyConversation = require('../models/PropertyConversation');
const RawEmailLog = require('../models/RawEmailLog');

const verifySendGridRequest = require('../middlewares/verifySendgridRequest');




function parseEmailField(raw) {
  if (!raw || typeof raw !== 'string') return { name: '', email: '' };
  const match = raw.match(/^(.*?)[<\\(]?([\\w._%+-]+@[\\w.-]+\\.[a-zA-Z]{2,})[>\\)]?$/);
  if (match) {
    return {
      name: match[1].replace(/["']/g, '').trim(),
      email: match[2].trim()
    };
  } else {
    return { name: '', email: raw.trim() };
  }
}


router.post('/', upload.any(), verifySendGridRequest, async (req, res) => {
  try {
    // Step 1: Save raw payload
    const rawPayload = {
      headers: req.headers,
      body: req.body,
      files: req.files
    };

    const rawLog = new RawEmailLog({
      rawPayload,
      parsedStatus: 'pending',
      receivedAt: new Date()
    });

    await rawLog.save();
    console.log('✅ Raw email saved to RawEmailLog');

    // Step 2: Attempt parsing immediately
    const parsedFields = {};
    req.body?.forEach?.((field) => {
      parsedFields[field.fieldname] = field.buffer?.toString('utf8') || '';
    });

    const rawFrom = parsedFields.from || req.body.from;
    const rawTo = parsedFields.to || req.body.to;
    
    const from = parseEmailField(rawFrom);
    const to = parseEmailField(rawTo);

    
    const subject = parsedFields.subject || req.body.subject;
    const html = parsedFields.html || req.body.html;
    const text = parsedFields.text || req.body.text;

    console.log('✅ Parsed Email Reply Fields:', { from, to, subject });

    // Step 3: Extract Property ID
    let propertyId = null;
    const htmlMatch = html?.match(/\[ref:propertyId=([a-zA-Z0-9]+)\]/i);
    if (htmlMatch) propertyId = htmlMatch[1];
    if (!propertyId && text) {
      const textMatch = text.match(/\[ref:propertyId=([a-zA-Z0-9]+)\]/i);
      if (textMatch) propertyId = textMatch[1];
    }

    if (!propertyId) {
      rawLog.parsedStatus = 'failed';
      await rawLog.save();
      console.warn('❌ Unable to extract Property ID from reply.');
      return res.status(200).send('Raw email saved, but Property ID not found.');
    }

    // Step 4: Save conversation
    const newConversation = new PropertyConversation({
      propertyId,
      type: 'reply',
      from,
      to,
      subject,
      message: html || text || '',
      timestamp: new Date(),
      isRead: false
    });

    await newConversation.save();
    rawLog.parsedStatus = 'parsed';
    await rawLog.save();

    console.log(`✅ Email reply saved in PropertyConversation for property ${propertyId}`);
    res.status(200).send('Reply saved and linked to property conversation.');
  } catch (error) {
    console.error('❌ Error processing email reply:', error);
    res.status(500).send('Failed to process email reply.');
  }
});




// // Fetch email replies for a specific email
// router.get('/email-replies', async (req, res) => {
//     try {
//         const { to } = req.query; // Get the recipient's email from the query parameter

//         if (!to) {
//             return res.status(400).json({ error: 'Recipient email (to) is required' });
//         }

//         const replies = await EmailReply.find({ to }).sort({ receivedAt: -1 }); // Get latest replies
//         res.json(replies);
//     } catch (error) {
//         console.error('Error fetching email replies:', error);
//         res.status(500).json({ error: 'Failed to fetch email replies' });
//     }
// });


module.exports = router;
