const express = require('express');
const router = express.Router();
const Task = require('../models/Task');

router.get('/follow-up-tasks', async (req, res) => {
    try {
        const tasks = await Task.find({ completed: false }).sort({ followUpDate: 1 });
        return res.status(200).json(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return res.status(500).json({ message: 'Error fetching tasks.' });
    }
});


module.exports = router;