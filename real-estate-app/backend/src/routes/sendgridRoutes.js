const express = require('express');
const sgMail = require('@sendgrid/mail');
const sgClient = require('@sendgrid/client');
const dotenv = require("dotenv");

const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { authMiddleware, authorize } = require('../middlewares/authMiddleware');

console.log("✅ NODE_ENV:", process.env.NODE_ENV);


// Load environment-specific `.env` file
if (process.env.NODE_ENV === "production") {
    dotenv.config({ path: ".env.production" });
} else {
    dotenv.config({ path: ".env.local" });
}


const router = express.Router();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
sgClient.setApiKey(process.env.SENDGRID_API_KEY);

// Send Email API
router.post('/', async (req, res) => {
    try {
        console.log(req)
        const { to, cc, propertyAddress, clientName, subject, message, attachments } = req.body;

        const msg = {
            to,
            cc,
            from: process.env.SENDGRID_FROM_EMAIL, // Your verified sender email
            replyTo: cc,
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


const verifyRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // max 3 requests per IP
    message: 'Too many verification requests. Try again later.'
});

router.post('/verify-sender', authMiddleware, verifyRateLimiter, async (req, res) => {
    try {
        const request = {
          method: 'POST',
          url: '/v3/verified_senders',
          body: {
            nickname: name,
            from_email: email,
            from_name: name,
            reply_to: email,
            reply_to_name: name,
            address: '123 Business Street',
            city: 'Brisbane',
            country: 'Australia'
          }
        };
      
        const [response, body] = await sgClient.request(request);
        console.log(`✅ Verification email sent for ${email}`);
        return res.status(200).json({ success: true, message: 'Verification email sent.' });
      
      } catch (error) {
        const errorBody = error?.response?.body || {};
      
        if (
          errorBody?.errors?.some(
            err => err.field === 'from_email' && err.message.includes('already exists')
          )
        ) {
          console.log(`ℹ️ Sender already exists for ${email}`);
          return res.status(200).json({ success: true, message: 'Verification email already sent previously. Please check your inbox.' });
        }
      
        console.error('❌ Failed to trigger verification email:', errorBody);
        return res.status(500).json({ success: false, error: 'Failed to send verification email' });
      }
      
});


router.post('/email-verification-status', authMiddleware, verifyRateLimiter, async (req, res) => {
  try {
    let isVerified = req.user.isEmailVerified;

    // If not verified yet, check with SendGrid
    if (!isVerified) {
      isVerified = await checkSendGridVerificationStatus(req.user.email);

      if (isVerified) {
        // Update DB instantly
        await User.updateOne({ _id: req.user._id }, { isEmailVerified: true });
      }
    }

    return res.status(200).json({ success: true, isEmailVerified: isVerified });
  } catch (error) {
    console.error('Error checking email verification status:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});



// utils/sendgridVerificationUtil.js
const checkSendGridVerificationStatus = async (email) => {
    try {
      const request = { method: 'GET', url: '/v3/verified_senders' };
      const [response, body] = await sgClient.request(request);
  
      const senders = body.results || []; // ✅ Get the array properly
  
      const match = senders.find(
        sender => sender.from_email === email && sender.verified === true
      );
      
      return !!match;
    } catch (error) {
      console.error('❌ Error checking SendGrid verification status:', error.response?.body || error.message);
      return false;
    }
  };
  


module.exports = router;
