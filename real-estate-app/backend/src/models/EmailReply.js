const mongoose = require('mongoose');

const EmailReplySchema = new mongoose.Schema({
    from: String,
    to: String,
    subject: String,
    body: String,
    receivedAt: { type: Date, default: Date.now }
});

const EmailReply = mongoose.model('EmailReply', EmailReplySchema);
module.exports = EmailReply;
