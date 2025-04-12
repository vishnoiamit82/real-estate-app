const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Hashed password for authentication
  phoneNumber: { type: String },

  // 🔹 Role-based access (assigned by admin)
  roles: {
    type: [String],
    enum: ['client', 'buyers_agent', 'sales_agent', 'external_partner', 'staff', 'admin', 'property_sourcer'],
    default: ['property_sourcer']
  },

  // 🔹 User-submitted interest/goals from signup
  goals: {
    type: [String],
    default: []
  },

  licenseNumber: { type: String },

  agencyName: String,       // For buyer's/sales agents
  specialty: String,        // For external partners (e.g., 'Conveyancer', 'Mortgage Broker')

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

  isActive: {
    type: Boolean,
    default: true
  },

  source: { type: String, default: 'organic' }, // optional: track where user came from

  // 🔐 For password reset
  resetToken: { type: String },
  resetTokenExpiration: { type: Date },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
