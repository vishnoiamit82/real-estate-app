// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/Users');
const bcrypt = require('bcryptjs');
const { getPermissions,ROLE_PERMISSIONS } = require('../config/permissions');
const { authMiddleware, authorize } = require('../middlewares/authMiddleware'); //
// PUT /api/users/:id - Update user roles, permissions, and subscription

// POST /api/users (Admin creates any type of user)
router.post('/', authMiddleware, authorize(['manage_users']), async (req, res) => {
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
            permissions: getPermissions(role, subscriptionTier) || [],
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
router.get('/', authMiddleware, authorize(['view_users']), async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});



router.put('/:id', authMiddleware, authorize(['manage_users']), async (req, res) => {
    try {
        const { id } = req.params;
        const { role, subscriptionTier, permissions } = req.body;

        // Find the user
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // If role is updated, sync permissions from ROLE_PERMISSIONS
        if (role) {
            user.role = role;
            user.permissions = ROLE_PERMISSIONS[role] || [];
        }

        // If manually provided, allow permission overrides
        if (permissions) {
            user.permissions = permissions;
        }

        if (subscriptionTier) user.subscriptionTier = subscriptionTier;

        await user.save();
        res.status(200).json({ message: 'User updated successfully', user });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Failed to update user' });
    }
});


// DELETE /api/users/:id - Delete a user (Admin only)
router.delete('/:id', authMiddleware, authorize(['manage_users']), async (req, res) => {
    try {
        const { id } = req.params;
        const deletedUser = await User.findByIdAndDelete(id);

        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Failed to delete user' });
    }
});

module.exports = router;
