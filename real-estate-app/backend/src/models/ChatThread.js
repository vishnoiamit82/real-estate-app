// ✅ Updated ChatThread model with best practices
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderType: { type: String, enum: ['poster', 'viewer'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const chatThreadSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  posterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  viewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  viewerAlias: { type: String, default: 'Anonymous User' },
  isArchived: { type: Boolean, default: false },

  messages: [messageSchema],

  hasUnreadMessagesForPoster: { type: Boolean, default: false },
  hasUnreadMessagesForViewer: { type: Boolean, default: false },

  lastMessage: { type: String, default: '' },
  lastMessageTimestamp: { type: Date, default: Date.now },

}, { timestamps: true });

chatThreadSchema.index({ propertyId: 1, viewerId: 1 }, { unique: true });

module.exports = mongoose.model('ChatThread', chatThreadSchema);