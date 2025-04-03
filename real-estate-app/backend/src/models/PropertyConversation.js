// ✅ models/PropertyConversation.js
const mongoose = require('mongoose');

const PropertyConversationSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  clientBriefId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientBrief' },
  type: {
    type: String,
    enum: ['sent', 'reply', 'message-poster', 'system-note'],
    required: true
  },
  subject: { type: String },
  message: { type: String },
  from: {
    name: String,
    email: String
  },
  to: {
    name: String,
    email: String
  },
  attachments: [{ type: String }],
  timestamp: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // ✅ New field to track unread replies
  isRead: { type: Boolean, default: false }
});


module.exports = mongoose.model('PropertyConversation', PropertyConversationSchema);