const mongoose = require('mongoose');

const ClientBriefSchema = new mongoose.Schema({
    buyerAgentId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'BuyersAgent', 
        required: true, 
        default: () => new mongoose.Types.ObjectId('65b0f5c3e3a4c256d4f8a2b7') 
    },
    clientName: { type: String, required: true },
    budget: { min: Number, max: Number },
    propertyType: { type: String },
    preferredLocations: { type: [String], default: [] },
    features: { type: [String], default: [] },
    bedrooms: { type: Number },
    bathrooms: { type: Number },
    fullName: { type: String },
    email: { type: String },
    phoneNumber: { type: String },
    address: { type: String },
    contractPurchaser: { type: String },
    investmentStrategy: { type: String },
    interestRate: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('ClientBrief', ClientBriefSchema);
