const express = require('express');
const router = express.Router();
const EmailTemplate = require('../models/EmailTemplates');
const { authMiddleware,authorize } = require('../middlewares/authMiddleware'); // Ensure you have this middleware

// Get all email templates - Users can only see their own templates unless admin
router.get('/', authMiddleware, authorize(['email_management']), async (req, res) => {
    try {
        let templates;
        if (req.user.role === 'admin') {
            templates = await EmailTemplate.find();
        } else {
            templates = await EmailTemplate.find({ createdBy: req.user._id });
        }
        res.json(templates);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching templates' });
    }
});

// Create a new email template - Only authenticated users can create
router.post('/', authMiddleware, authorize(['email_management']), async (req, res) => {
    try {
        const { name, subject, body, type } = req.body;
        const template = new EmailTemplate({
            name,
            subject,
            body,
            type,
            createdBy: req.user._id
        });
        await template.save();
        res.status(201).json(template);
    } catch (error) {
        res.status(500).json({ error: 'Error creating template' });
    }
});

// Update an email template - Users can only update their own templates unless admin
router.put('/:id', authMiddleware, authorize(['email_management']), async (req, res) => {
    try {
        const { name, subject, body, type } = req.body;
        let template = await EmailTemplate.findById(req.params.id);

        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        if (template.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized to update this template' });
        }

        template = await EmailTemplate.findByIdAndUpdate(
            req.params.id,
            { name, subject, body, type, updatedAt: Date.now() },
            { new: true }
        );
        res.json(template);
    } catch (error) {
        res.status(500).json({ error: 'Error updating template' });
    }
});

// Delete an email template - Users can only delete their own templates unless admin
router.delete('/:id', authMiddleware, authorize(['email_management']), async (req, res) => {
    try {
        let template = await EmailTemplate.findById(req.params.id);

        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        if (template.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized to delete this template' });
        }

        await EmailTemplate.findByIdAndDelete(req.params.id);
        res.json({ message: 'Template deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting template' });
    }
});

module.exports = router;
