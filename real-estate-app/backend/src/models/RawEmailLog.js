// ✅ RawEmailLog.js (Model)
const mongoose = require('mongoose');

const RawEmailLogSchema = new mongoose.Schema({
  rawPayload: { type: mongoose.Schema.Types.Mixed, required: true },
  receivedAt: { type: Date, default: Date.now },
  parsedStatus: { type: String, enum: ['pending', 'parsed', 'failed'], default: 'pending' },
  parsingErrors: { type: String },
});

module.exports = mongoose.model('RawEmailLog', RawEmailLogSchema);
