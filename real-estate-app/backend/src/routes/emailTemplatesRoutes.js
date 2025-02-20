const express = require('express');
const router = express.Router();
const EmailTemplate = require('../models/EmailTemplates');



// Get all email templates
router.get('/', async (req, res) => {
    console.log('Auth Middleware Passed. User:', req.user);
    console.log('Request Headers:', req.headers);
    
    try {
        const templates = await EmailTemplate.find();
        res.json(templates);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching templates' });
    }
});

// Create a new email template
router.post('/', async (req, res) => {
    try {
        console.log (req.body)
        const { name, subject, body, type } = req.body;
        const template = new EmailTemplate({ name, subject, body, type });
        await template.save();
        res.status(201).json(template);
    } catch (error) {
        res.status(500).json({ error: 'Error creating template' });
    }
});


// Update an email template
router.put('/:id', async (req, res) => {
    try {
        const { name, subject, body, type } = req.body;
        const template = await EmailTemplate.findByIdAndUpdate(req.params.id, { 
            name, subject, body, type, updatedAt: Date.now()
        }, { new: true });
        res.json(template);
    } catch (error) {
        res.status(500).json({ error: 'Error updating template' });
    }
});

// Delete an email template
router.delete('/:id', async (req, res) => {
    try {
        await EmailTemplate.findByIdAndDelete(req.params.id);
        res.json({ message: 'Template deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting template' });
    }
});

module.exports = router;
