const mongoose = require('mongoose');

const ClientBriefSchema = new mongoose.Schema({
  buyerAgentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional

  clientName: String,
  budget: {
    max: Number,
  },
  preferredLocations: [String],
  bedrooms: Number,
  bathrooms: Number,
  fullName: String,
  email: String,
  phoneNumber: String,
  address: String,
  contractPurchaser: String,
  entityType: {
    type: String,
    enum: ['Trust', 'SMSF', 'Individual', 'Not decided'],
  },
  investmentStrategy: String,
  interestRate: Number,
  minYield: Number,
  maxMonthlyHoldingCost: Number,
  minBuildYear: Number,
  interestRate: { type: Number }, // ✅ New field
  lvr: { type: Number, default: 80 }, // ✅ New field
  weightage: {
    location: Number,
    budget: Number,
    bedrooms: Number,
    bathrooms: Number,
    subdivisionPotential: Number,
    minYield: Number,
    maxMonthlyHoldingCost: Number,
    ageOfProperty: Number,
  },
}, { timestamps: true });

module.exports = mongoose.model('ClientBrief', ClientBriefSchema);
