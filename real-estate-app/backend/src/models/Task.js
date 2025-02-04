const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    task: { type: String, required: true },
    followUpDate: { type: Date, default: null }, // ✅ Allow `null` if missing
    reason: { type: String, required: true },
    propertyAddress: { type: String, required: true },
    completed: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);
