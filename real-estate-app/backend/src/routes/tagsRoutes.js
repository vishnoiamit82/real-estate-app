const express = require('express');
const router = express.Router();
const Tag = require('../models/Tags');
const { authMiddleware, authorize } = require('../middlewares/authMiddleware'); //

// GET all tags (admin only)
router.get(
  '/',
  async (req, res) => {
    try {
      const tags = await Tag.find({});
      res.status(200).json(tags);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch tags', error });
    }
  }
);

// POST a new tag (admin only)
router.post(
  '/',
  (req, res, next) => {
    req.route.settings = { permissions: ['edit_tags'] };
    next();
  },
  authorize(['edit_tags']),
  async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access only' });
      }

      const { name, type } = req.body;
      const newTag = new Tag({ name, type });
      await newTag.save();
      res.status(201).json(newTag);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create tag', error });
    }
  }
);

// PUT update tag
router.put(
  '/:id',
  (req, res, next) => {
    req.route.settings = { permissions: ['edit_tags'] };
    next();
  },
  authorize(['edit_tags']),
  async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access only' });
      }

      const { name, type } = req.body;
      const updated = await Tag.findByIdAndUpdate(req.params.id, { name, type }, { new: true });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update tag', error });
    }
  }
);

// DELETE tag
router.delete(
  '/:id',
  (req, res, next) => {
    req.route.settings = { permissions: ['edit_tags'] };
    next();
  },
  authorize(['edit_tags']),
  async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access only' });
      }

      await Tag.findByIdAndDelete(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete tag', error });
    }
  }
);

module.exports = router;
