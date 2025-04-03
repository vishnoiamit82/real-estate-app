const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema({
    address: { type: String, required: true, trim: true },
    isOffmarket: { type: Boolean, default: false },
    subdivisionPotential: { type: Boolean, default: false },
    propertyLink: { type: String, trim: true },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' }, // Link to Agent model
    askingPrice: { type: String, trim: true },
    rental: { type: String, trim: true },
    rentalYield: { type: String, trim: true },
    // Add these just below `rentalYield`
    askingPriceMin: { type: Number },
    askingPriceMax: { type: Number },
    rentPerWeek: { type: Number },
    rentalYieldPercent: { type: Number },

    

    // Additional Property Details
    bedrooms: { type: Number, default: 0 },
    bathrooms: { type: Number, default: 0 },
    carSpaces: { type: Number, default: 0 },
    landSize: { type: String, trim: true },
    propertyType: { type: String, trim: true },
    yearBuilt: { type: String, trim: true },
    features: [{ type: String }], // Array of features
    councilRate: { type: String, trim: true },
    insurance: { type: String, trim: true },
    floodZone: { type: String, trim: true },
    bushfireZone: { type: String, trim: true },
    zoningType: { type: String, trim: true },
    nearbySchools: [{ type: String }], // Array of nearby schools
    publicTransport: [{ type: String }], // Array of transport links
    marketTrends: { type: String, trim: true },
    tags: [{ type: String }],
    mapsLink: { type: String, trim: true },

    landSizeNumeric: { type: Number, trim: true },
    yearBuiltNumeric: { type: Number, trim: true },

    // Important Dates
    offerClosingDate: { type: String },
    videoAvailableDate: { type: String, default: null },
    upcomingInspectionDate: { type: String, default: null },
    additionalDocsExpected: { type: String, default: null },

    // Condition & Renovation Info
    propertyCondition: { type: String, trim: true },
    potentialRenovations: { type: String, trim: true },

    // Conversation Log
    conversation: [
        {
            timestamp: { type: Date, default: Date.now },
            content: { type: String, required: true },
        }
    ],

    // **New: Notes Section**
    notes: [
        {
            content: { type: String, required: true },
            timestamp: { type: Date, default: Date.now },
        }
    ],

    // Follow-Up Tasks (Only created when required)
    followUpTasks: [
        {
            task: { type: String, required: true },
            followUpDate: { type: Date, default: null },
            reason: { type: String, required: true },
            completed: { type: Boolean, default: false },
        }
    ],

    // Status Tracking
    currentStatus: {
        type: String,
        enum: ['available', 'sold', 'offer_accepted'],
        default: 'available',
    },
    decisionStatus: {
        type: String,
        enum: ["undecided", "pursue", "on_hold"],
        default: "undecided",
    },

    // Soft Delete Fields
    is_deleted: { type: Boolean, default: false },
    deleted_at: { type: Date, default: null },
    
    // New fields for visibility and privacy
    publicListing: { type: Boolean, default: false }, // false means only owner/shared users can see it
    showAddress: { type: Boolean, default: true }, // true means address is shown publicly

    shareToken: { type: String, default: null },
    isCommunityShared: { type: Boolean, default: false },
    sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

      // **New: Due Diligence Object**
    dueDiligence: {
        insurance: { type: String,  default: null },
        floodZone: { type: String,  default: null },
        bushfireZone: { type: String,  default: null },
        socialHousing: { type: String,  default: null },
        // Allow dynamic fields for additional checks
        additionalChecks: [{ 
            name: { type: String, required: true },
            status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" }
        }]
    },
    

    // // Array of users with whom this property is shared
    // sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]



}, { timestamps: true }); // Auto-generated createdAt & updatedAt fields

module.exports = mongoose.model('Property', PropertySchema);
