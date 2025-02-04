const express = require('express');
const router = express.Router();
const ClientBrief = require('../models/ClientBriefs');
const Property = require('../models/Property');

// Create a new client brief
router.post('/', async (req, res) => {
    try {
        console.log('Request body:', req.body);
        const clientBrief = new ClientBrief(req.body);
        await clientBrief.save();
        res.status(201).json(clientBrief);
    } catch (error) {
        console.error('Error creating client brief:', error);
        res.status(500).json({ message: 'Error creating client brief.' });
    }
});

// Fetch all client briefs for a buyers' agent
router.get('/', async (req, res) => {
    try {

        const buyerAgentId = req.query.buyerAgentId || '65b0f5c3e3a4c256d4f8a2b7'; // Use default ID
        const briefs = await ClientBrief.find({ buyerAgentId });
        res.status(200).json(briefs);
    } catch (error) {
        console.error('Error fetching client briefs:', error);
        res.status(500).json({ message: 'Error fetching client briefs.' });
    }
});

// Fetch a single client brief by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const clientBrief = await ClientBrief.findById(id);

        if (!clientBrief) {
            return res.status(404).json({ message: 'Client brief not found.' });
        }

        res.status(200).json(clientBrief);
    } catch (error) {
        console.error('Error fetching client brief:', error);
        res.status(500).json({ message: 'Error fetching client brief.' });
    }
});

// Update an existing client brief by ID
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updatedClientBrief = await ClientBrief.findByIdAndUpdate(id, req.body, {
            new: true, // Return the updated document
            runValidators: true, // Ensure validation rules are applied
        });

        if (!updatedClientBrief) {
            return res.status(404).json({ message: 'Client brief not found.' });
        }

        res.status(200).json(updatedClientBrief);
    } catch (error) {
        console.error('Error updating client brief:', error);
        res.status(500).json({ message: 'Error updating client brief.' });
    }
});



router.get('/:id/matches', async (req, res) => {
    try {
        const clientBrief = await ClientBrief.findById(req.params.id);
        if (!clientBrief) return res.status(404).json({ message: 'Client brief not found.' });

        const properties = await Property.find(); // Fetch all properties
        const matches = properties.map((property) => {
            let score = 0;

            // Budget match
            if (
                property.askingPrice >= (clientBrief.budget?.min || 0) &&
                property.askingPrice <= (clientBrief.budget?.max || Infinity)
            ) {
                score += 30;
            }

            // Location match
            if (
                Array.isArray(clientBrief.preferredLocations) &&
                clientBrief.preferredLocations.length > 0
            ) {
                if (
                    clientBrief.preferredLocations.some(
                        (location) => typeof property.address === 'string' && property.address.startsWith(location)
                    )
                ) {
                    score += 40;
                }
            }

            // Features match
            if (Array.isArray(clientBrief.features) && clientBrief.features.length > 0) {
                const matchingFeatures = clientBrief.features.filter((feature) =>
                    Array.isArray(property.features) && property.features.includes(feature)
                );
                score += (matchingFeatures.length / clientBrief.features.length) * 30;
            }

            return { property, score };
        }).sort((a, b) => b.score - a.score);

        console.log (matches)

        res.status(200).json(matches);
    } catch (error) {
        console.error('Error fetching matches:', error);
        res.status(500).json({ message: 'Error fetching matches.' });
    }
});



// Delete a client brief by ID
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedBrief = await ClientBrief.findByIdAndDelete(id);

        if (!deletedBrief) {
            return res.status(404).json({ message: 'Client brief not found.' });
        }

        res.status(200).json({ message: 'Client brief deleted successfully.' });
    } catch (error) {
        console.error('Error deleting client brief:', error);
        res.status(500).json({ message: 'Error deleting client brief.' });
    }
});


module.exports = router;
