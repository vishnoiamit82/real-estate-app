// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Hashed password for authentication
    phoneNumber: { type: String },
    role: { 
        type: String, 
        enum: ['client', 'buyers_agent', 'sales_agent', 'external_partner', 'staff', 'admin', 'property_sourcer'],
        default: 'property_sourcer'
    },
    subscriptionTier: {
        type: String,
        enum: ['free', 'medium', 'premium'],
        default: 'free'
    },
    permissions: [String],
    isEmailVerified: {
        type: Boolean,
        default: false
      },

    isApproved: {
        type: Boolean,
        default: false
    },  
      
 
    agencyName: String, // For sales and buyer's agents
    specialty: String, // For external partners (e.g., "Build and Pest", "Conveyancer")

    // 🔹 Add Password Reset Token Fields
    resetToken: { type: String },  
    resetTokenExpiration: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
