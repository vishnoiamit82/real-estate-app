// middlewares/verifySendGridRequest.js
const ipRangeCheck = require('ip-range-check');

const allowedIps = (process.env.SENDGRID_ALLOWED_IPS || '')
  .split(',')
  .map(ip => ip.trim())
  .filter(Boolean); // Ensure no empty strings

const sendgridSecret = process.env.SENDGRID_REPLY_SECRET;

module.exports = function verifySendGridRequest(req, res, next) {
  const requestIp =
    (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').split(',')[0].trim();

  const token = req.query.token || req.headers['x-sendgrid-token'];

  const isIpAllowed = allowedIps.length > 0 && ipRangeCheck(requestIp, allowedIps);
  const isTokenValid = token && token === sendgridSecret;

  if (!isIpAllowed && !isTokenValid) {
    console.warn(`[SECURITY] Blocked email-reply access from IP: ${requestIp} | Token valid: ${isTokenValid}`);
    return res.status(403).json({ message: 'Forbidden: Unauthorized access' });
  }

  next();
};
