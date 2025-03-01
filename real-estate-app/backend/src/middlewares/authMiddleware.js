// authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/Users');


const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('🚨 No token provided in request headers.');
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1]; // Extract token after "Bearer "

    try {
        console.log('🔍 Decoding Token:', token);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('✅ Token Decoded:', decoded);

        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            console.log('🚨 Token valid but user not found in database.');
            return res.status(401).json({ error: 'Unauthorized: User not found' });
        }

        console.log('✅ Authenticated User:', req.user);
        next();
    } catch (error) {
        console.log('❌ Error verifying token:', error.message);
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
};

// Middleware for authorization (checks user permissions)
// Authorization Middleware with Debug Logging
const authorize = (requiredPermissions = []) => {
    return (req, res, next) => {
        console.log('🔍 [Authorize Middleware] Executing...');
        console.log('👤 User Permissions:', req.user?.permissions || 'No user found');
        console.log('🔒 Required Permissions:', requiredPermissions);

        if (!req.user) {
            console.warn('🚫 [Authorize Middleware] Unauthorized: No user found');
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const hasPermission = requiredPermissions.every(permission =>
            req.user.permissions.includes(permission)
        );

        console.log('✅ [Authorize Middleware] Permission Check:', hasPermission);

        if (!hasPermission) {
            console.warn('🚫 [Authorize Middleware] Access denied');
            return res.status(403).json({ message: 'Access denied' });
        }

        next();
    };
};



module.exports = {
    authMiddleware,
    authorize
};
