const mongoose = require('mongoose');

const BuyersAgentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    agency: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('BuyersAgent', BuyersAgentSchema);
