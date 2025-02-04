const mongoose = require('mongoose');

const EmailTemplateSchema = new mongoose.Schema({
    name: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    type: { type: String, enum: ['inquiry', 'offer', 'custom'], default: 'custom' }
});

module.exports = mongoose.model('EmailTemplates', EmailTemplateSchema);