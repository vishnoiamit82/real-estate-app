const Property = require('../models/Property');

// Get property conversations
exports.getConversations = async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if (!property) return res.status(404).json({ message: 'Property not found' });
        res.status(200).json(property.conversations);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching conversations', error });
    }
};
