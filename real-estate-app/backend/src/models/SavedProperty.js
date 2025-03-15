const mongoose = require('mongoose');

const SavedPropertySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  communityPropertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // NEW
  savedAt: { type: Date, default: Date.now },
  notes: { type: String },
  status: {
    type: String,
    enum: ['saved', 'shortlisted', 'contacted', 'rejected'],
    default: 'saved'
  },
  decisionStatus: { type: String, enum: ['pursue', 'on_hold', 'undecided'], default: 'undecided' },
  tags: [String],
  notes: { type: String },
  isArchived: { type: Boolean, default: false },
  viewCount: { type: Number, default: 0 },
  lastViewedAt: { type: Date },
  priority: { type: Number, min: 1, max: 5 }
});


module.exports = mongoose.model('SavedProperty', SavedPropertySchema);
