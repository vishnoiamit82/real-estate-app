// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_SECRET = process.env.JWT_SECRET;

// Example refresh token validation (you may replace with DB verification)
const validateRefreshToken = (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    return decoded;
  } catch (err) {
    return null;
  }
};

// Refresh token endpoint
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: 'Missing refresh token' });
  }

  const decoded = validateRefreshToken(refreshToken);
  if (!decoded) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }

  // Create new short-lived auth token
  const newAuthToken = jwt.sign(
    {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name
    },
    ACCESS_SECRET,
    { expiresIn: '15m' } // Adjust as needed
  );

  return res.status(200).json({ newAuthToken });
});

module.exports = router;
