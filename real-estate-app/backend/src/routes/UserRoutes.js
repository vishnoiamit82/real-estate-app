// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/Users');
const bcrypt = require('bcrypt');
const { getPermissions } = require('../config/permissions');

// POST /api/users (Admin creates any type of user)
router.post('/', async (req, res) => {
    try {
        const { name, email, password, phoneNumber, role, subscriptionTier, agencyName, specialty } = req.body;

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            name,
            email,
            password: hashedPassword,
            phoneNumber,
            role,
            subscriptionTier,
            permissions: getPermissions(role,subscriptionTier) || [],
            agencyName,
            specialty
        });

        await user.save();
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Failed to create user' });
    }
});


// GET /api/users (Admin-only access)
router.get('/', async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});


module.exports = router;
