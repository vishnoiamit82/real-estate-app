// authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/Users');

// Middleware for authentication (verifies JWT and sets req.user)
const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);
            
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            
            req.user = user;
            next();
        } catch (error) {
            return res.status(401).json({ message: 'Invalid token' });
        }
    } else {
        console.warn('No token provided in request.');
        return res.status(401).json({ message: 'No token provided' });
    }
};

// Middleware for authorization (checks user permissions)
const authorize = (requiredPermissions = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const hasPermission = requiredPermissions.every(permission =>
            req.user.permissions.includes(permission)
        );

        if (!hasPermission) {
            return res.status(403).json({ message: 'Access denied' });
        }

        next();
    };
};

module.exports = {
    authMiddleware,
    authorize
};
