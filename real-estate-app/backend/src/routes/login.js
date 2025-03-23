const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User'); // Import User model

const router = express.Router();

// Login Route
// POST /api/login
router.post('/', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: 'Invalid credentials' });

    // Create Access Token (short-lived)
    const accessToken = jwt.sign(
      {
        id: user._id,
        role: user.role,
        permissions: user.permissions,
        name: user.name,
        isEmailVerified: user.isEmailVerified
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' } // Short-lived
    );

    // Create Refresh Token (long-lived)
    const refreshToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' } // You can adjust this
    );

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken, // ✅ Include this in response
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
