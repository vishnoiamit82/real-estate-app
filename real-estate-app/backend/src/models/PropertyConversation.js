// ✅ models/PropertyConversation.js
const mongoose = require('mongoose');

const PropertyConversationSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  clientBriefId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientBrief' }, // optional
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
  attachments: [{ type: String }], // file URLs or filenames
  timestamp: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('PropertyConversation', PropertyConversationSchema);