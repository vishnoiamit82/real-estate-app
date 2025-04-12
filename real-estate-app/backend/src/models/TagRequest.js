// models/TagRequest.js
const mongoose = require('mongoose');

const tagRequestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  placement: { type: String, default: 'unknown' }, // e.g., 'card', 'filter', etc.
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('TagRequest', tagRequestSchema);
