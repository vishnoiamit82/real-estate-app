const mongoose = require('mongoose');

const AgentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: false }, // Optional field
    phoneNumber: { type: String, required: false }, // Optional field
    agencyName: { type: String, required: false }, // New field
    region: { type: String, required: false } // New field
},
{
    timestamps: true, // Enable timestamps for createdAt and updatedAt
}
);

module.exports = mongoose.model('Agent', AgentSchema);
