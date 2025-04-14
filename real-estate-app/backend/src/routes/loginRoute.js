// routes/loginRoute.js
const express = require('express');
const router = express.Router();
const User = require('../models/Users');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// POST /api/login
router.post('/', async (req, res) => {
    try {
        const { email, password } = req.body;

       
        // Find user by email
        const user = await User.findOne({
            email: new RegExp(`^${email}$`, 'i')  // ^ and $ ensure full string match, 'i' makes it case-insensitive
          });
          
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Validate password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!user.isApproved)
        return res.status(403).json({ message: 'Your account is under review and pending approval.' });


        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, role: user.role, permissions: user.permissions, name: user.name, isEmailVerified: user.isEmailVerified },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                permissions: user.permissions
            }
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
