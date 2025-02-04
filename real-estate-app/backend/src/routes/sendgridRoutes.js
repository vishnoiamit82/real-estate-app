const express = require('express');
const sgMail = require('@sendgrid/mail');
require('dotenv').config();

const router = express.Router();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Send Email API
router.post('/', async (req, res) => {
    try {
        console.log (req.body)
        const { to, propertyAddress, clientName, subject, message, attachments } = req.body;
        
        const msg = {
            to,
            from: process.env.SENDGRID_FROM_EMAIL, // Your verified sender email
            subject: subject || propertyAddress,
            html: `<p>${message}</p>`,
            attachments: attachments?.map(file => ({
                content: file.base64,
                filename: file.filename,
                type: file.mimetype,
                disposition: 'attachment'
            })) || []
        };

        await sgMail.send(msg);
        res.status(200).json({ success: true, message: 'Email sent successfully!' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
