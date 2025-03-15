const express = require('express');
const router = express.Router();
const Property = require('../models/Property');

// routes/propertyRoutes.js (continued)
router.get('/:shareToken', async (req, res) => {
    try {
        const property = await Property.findOne({ shareToken: req.params.shareToken })
            .populate('agentId', 'name email phoneNumber')
            .populate('createdBy', 'name email');
        if (!property) {
            return res.status(404).json({ message: 'Property not found or link expired.' });
        }
        // Optionally sanitize details (e.g., hide address if showAddress is false for non-owners)
        // For public viewing, you might simply send all non-sensitive info.
        res.status(200).json(property);
    } catch (error) {
        console.error('Error retrieving shared property:', error);
        res.status(500).json({ message: 'Error retrieving property.' });
    }
});

module.exports = router;

