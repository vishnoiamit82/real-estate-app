const express = require('express');
const router = express.Router();
const EmailTemplate = require('../models/EmailReply.js');

router.post('/', async (req, res) => {
    try {
        const { from, to, subject, text, html } = req.body;

        console.log('Received Email Reply:', { from, to, subject, text });

        // Save the reply to the database (e.g., MongoDB)
        const newReply = new EmailReply({
            from,
            to,
            subject,
            body: html || text,
            receivedAt: new Date(),
        });
        await newReply.save();

        res.status(200).send('Email response recorded.');
    } catch (error) {
        console.error('Error processing email reply:', error);
        res.status(500).send('Failed to process email reply.');
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
