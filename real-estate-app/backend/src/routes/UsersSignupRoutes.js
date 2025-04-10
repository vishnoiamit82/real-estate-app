const express = require('express');
const router = express.Router();
const User = require('../models/Users');
const bcrypt = require('bcryptjs');
const { getPermissions } = require('../config/permissions');
const sgMail = require('@sendgrid/mail');
const dotenv = require("dotenv");

if (process.env.NODE_ENV === "production") {
    dotenv.config({ path: ".env.production" });
} else if(process.env.NODE_ENV === "test"){
    dotenv.config({ path: ".env.test" });
}
else {
    dotenv.config({ path: ".env.local" });
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// POST /api/signup
router.post('/', async (req, res) => {
    try {
        const { name, email, password, phoneNumber } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            name,
            email,
            password: hashedPassword,
            phoneNumber,
            role: 'property_sourcer',
            subscriptionTier: 'free',
            permissions: getPermissions("property_sourcer", "free") || []
        });

        await user.save();

        // ✅ Send email with approval process messaging
        const msg = {
            to: email,
            from: process.env.SENDGRID_FROM_EMAIL,
            cc: process.env.SENDGRID_FROM_EMAIL,
            subject: `Thank you for signing up, ${name}!`,
            text: `Hi ${name},\n\nThanks for signing up to our platform. Your account is currently under review as part of our approval process. You’ll receive a confirmation email once your account is approved and activated.\n\nIn the meantime, feel free to explore our platform or reach out if you have any questions.\n\nRegards,\nThe Team`,
            html: `
                <p>Hi ${name},</p>
                <p>Thanks for signing up to our <strong>real estate sourcing platform</strong>.</p>
                <p>Your account is currently under review as part of our <strong>approval process</strong>. You’ll receive an email once your account is approved and activated.</p>
                <p>In the meantime, feel free to explore our platform or contact us if you have any questions.</p>
                <p>Cheers,<br/>The Team</p>
            `
        };

        console.log (msg)

        await sgMail.send(msg);

        res.status(201).json({ message: 'Signup successful. Approval email sent.' });
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).json({ message: 'Signup failed' });
    }
});

module.exports = router;
