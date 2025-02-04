const express = require('express');
const router = express.Router();
const Agent = require('../models/Agent');

// Create an agent
router.post('/', async (req, res) => {
    try {
        const agent = new Agent(req.body);
        await agent.save();
        res.status(201).json(agent);
    } catch (error) {
        res.status(500).json({ message: 'Error creating agent', error });
    }
});

// Get all agents
router.get('/', async (req, res) => {
    try {
        const agents = await Agent.find();
        res.status(200).json(agents);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching agents', error });
    }
});

// Get a single agent by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const agent = await Agent.findById(id);

        if (!agent) {
            return res.status(404).json({ message: 'Agent not found.' });
        }

        res.status(200).json(agent);
    } catch (error) {
        console.error('Error fetching agent:', error);
        res.status(500).json({ message: 'Error fetching agent.' });
    }
});

// Update an agent by ID
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updatedAgent = await Agent.findByIdAndUpdate(id, req.body, {
            new: true, // Return the updated document
            runValidators: true, // Ensure schema validation runs
        });

        if (!updatedAgent) {
            return res.status(404).json({ message: 'Agent not found.' });
        }

        res.status(200).json(updatedAgent);
    } catch (error) {
        console.error('Error updating agent:', error);
        res.status(500).json({ message: 'Error updating agent.' });
    }
});

// DELETE agent by ID
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedAgent = await Agent.findByIdAndDelete(id);

        if (!deletedAgent) {
            return res.status(404).json({ message: 'Agent not found.' });
        }

        res.status(200).json({ message: 'Agent deleted successfully.' });
    } catch (error) {
        console.error('Error deleting agent:', error);
        res.status(500).json({ message: 'Error deleting agent.' });
    }
});

module.exports = router;
