// routes/loginRoute.js
const express = require('express');
const router = express.Router();
const User = require('../models/Users');
const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
const crypto = require("crypto");

const sgMail = require('@sendgrid/mail');

const dotenv = require("dotenv");


console.log("✅ NODE_ENV:", process.env.NODE_ENV);


// Load environment-specific `.env` file
if (process.env.NODE_ENV === "production") {
    dotenv.config({ path: ".env.production" });
} else {
    dotenv.config({ path: ".env.local" });
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);


// POST /api/login
// Forgot Password Route
// Forgot Password Route
router.post("/", async (req, res) => {
    const { email } = req.body;
    console.log("Received Email:", req.body.email);

    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetToken = resetToken;
    user.resetTokenExpiration = Date.now() + 3600000; // Token expires in 1 hour
    await user.save();

    // SendGrid Email
    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const msg = {
        to: user.email,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: "Password Reset Request",
        html: `<p>Click <a href="${resetLink}">here</a> to reset your password. The link expires in 1 hour.</p>`,
    };

    await sgMail.send(msg);

    res.json({ message: "Password reset link sent!" });
});




module.exports = router;
