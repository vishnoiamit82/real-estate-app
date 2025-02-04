const express = require('express');
const router = express.Router();
const BuyersAgent = require('../models/BuyersAgent'); // Assuming you have a BuyersAgent model

// Create a new buyer's agent
router.post('/', async (req, res) => {
    try {
        const buyersAgent = new BuyersAgent(req.body);
        await buyersAgent.save();
        res.status(201).json(buyersAgent);
    } catch (error) {
        console.error('Error creating buyers agent:', error);
        res.status(500).json({ message: 'Error creating buyers agent.' });
    }
});

// Get all buyer agents
router.get('/', async (req, res) => {
    try {
        const buyersAgents = await BuyersAgent.find();
        res.status(200).json(buyersAgents);
    } catch (error) {
        console.error('Error fetching buyers agents:', error);
        res.status(500).json({ message: 'Error fetching buyers agents.' });
    }
});

// Get a single buyer's agent by ID
router.get('/:id', async (req, res) => {
    try {
        const buyersAgent = await BuyersAgent.findById(req.params.id);
        if (!buyersAgent) {
            return res.status(404).json({ message: 'Buyers agent not found.' });
        }
        res.status(200).json(buyersAgent);
    } catch (error) {
        console.error('Error fetching buyers agent:', error);
        res.status(500).json({ message: 'Error fetching buyers agent.' });
    }
});

// Update a buyer's agent by ID
router.put('/:id', async (req, res) => {
    try {
        const updatedAgent = await BuyersAgent.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedAgent) {
            return res.status(404).json({ message: 'Buyers agent not found.' });
        }
        res.status(200).json(updatedAgent);
    } catch (error) {
        console.error('Error updating buyers agent:', error);
        res.status(500).json({ message: 'Error updating buyers agent.' });
    }
});

// Delete a buyer's agent by ID
router.delete('/:id', async (req, res) => {
    try {
        const deletedAgent = await BuyersAgent.findByIdAndDelete(req.params.id);
        if (!deletedAgent) {
            return res.status(404).json({ message: 'Buyers agent not found.' });
        }
        res.status(200).json({ message: 'Buyers agent deleted successfully.' });
    } catch (error) {
        console.error('Error deleting buyers agent:', error);
        res.status(500).json({ message: 'Error deleting buyers agent.' });
    }
});

module.exports = router;
