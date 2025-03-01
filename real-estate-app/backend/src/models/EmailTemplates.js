const mongoose = require('mongoose');

const EmailTemplateSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    type: { type: String, enum: ['inquiry', 'offer', 'custom'], default: 'custom' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false }, // Soft delete flag
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

module.exports = mongoose.model('EmailTemplate', EmailTemplateSchema);