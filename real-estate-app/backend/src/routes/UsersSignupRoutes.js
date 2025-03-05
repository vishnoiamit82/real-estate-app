// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/Users');
const bcrypt = require('bcryptjs');
const { getPermissions } = require('../config/permissions');

// POST /api/signup (Public endpoint for self-signup, default role is "client")
router.post('/', async (req, res) => {
    try {
        const { name, email, password, phoneNumber } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            name,
            email,
            password: hashedPassword,
            phoneNumber,
            role: 'property_sourcer', // Default role
            subscriptionTier: 'free',
            permissions: getPermissions("property_sourcer","free") || []
        });

        await user.save();
        res.status(201).json({ message: 'Signup successful' });
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).json({ message: 'Signup failed' });
    }
});
module.exports = router;