const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const { authMiddleware,authorize } = require('../middlewares/authMiddleware'); // Ensure you have this middleware
const crypto = require('crypto');
const ClientBrief = require('../models/ClientBriefs');

const twilio = require('twilio');

// Helper function to sanitize date values
const parseDateOrNull = (dateString) => {
    if (!dateString || dateString.toLowerCase() === "not provided") return null;
    const parsedDate = new Date(dateString);
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
};

// PATCH /properties/:id/share-to-community
router.patch('/:id/share-to-community', async (req, res) => {
    try {
      const property = await Property.findById(req.params.id);
  
      if (!property) return res.status(404).json({ message: 'Property not found' });
  
      if (property.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Unauthorized to share this property' });
      }
  
      property.isCommunityShared = true;
      property.sharedBy = req.user._id;
  
      await property.save();
  
      return res.status(200).json({ message: 'Property shared to community successfully.' });
    } catch (err) {
      console.error('Error sharing property:', err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  });


  router.patch('/:id/unshare-from-community', async (req, res) => {
    try {
      const property = await Property.findById(req.params.id);
  
      if (!property) return res.status(404).json({ message: 'Property not found' });
  
      if (property.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Unauthorized to unshare this property' });
      }
  
      property.isCommunityShared = false;
      property.sharedBy = null;
  
      await property.save();
  
      return res.status(200).json({ message: 'Property unshared from community successfully.' });
    } catch (err) {
      console.error('Error unsharing property:', err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  });
  

  
  


// ✅ Fetch Due Diligence Status
router.get('/:id/due-diligence', authorize(['view_property']), async (req, res) => {
    try {
        const property = await Property.findById(req.params.id).populate('createdBy', 'name email phoneNumber');

        if (!property) {
            return res.status(404).json({ message: "Property not found" });
        }

        res.json({
            dueDiligence: property.dueDiligence,
            createdBy: property.createdBy
        });
    } catch (error) {
        console.error("Error fetching due diligence:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});

// ✅ Update Due Diligence Status (Only property creator can update)
router.patch('/:id/due-diligence', authorize(['update_property']), async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);

        if (!property) {
            return res.status(404).json({ message: "Property not found" });
        }

        // Ensure only the owner can update due diligence
        if (property.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Unauthorized to update this property" });
        }

        // Sanitize incoming data
        const sanitizedData = {};

        Object.keys(req.body.dueDiligence).forEach((key) => {
            if (property.dueDiligence.hasOwnProperty(key)) {
                sanitizedData[`dueDiligence.${key}`] = req.body.dueDiligence[key];
            }
        });

        

        // Update property with sanitized due diligence data
        await Property.findByIdAndUpdate(req.params.id, { $set: sanitizedData }, { new: true });

        res.json({
            message: "Due diligence updated successfully",
            dueDiligence: { ...property.dueDiligence, ...req.body }
        });
    } catch (error) {
        console.error("Error updating due diligence:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});


// ✅ Validate if Due Diligence is Complete
router.get('/:id/due-diligence/validate', authorize(['view_property']), async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);

        if (!property) {
            return res.status(404).json({ message: "Property not found" });
        }

        // Extract due diligence fields & additionalChecks
        const dueDiligenceFields = { ...property.dueDiligence };
        const additionalChecks = dueDiligenceFields.additionalChecks || [];

        // Remove 'additionalChecks' from the main object so it doesn't interfere with validation
        delete dueDiligenceFields.additionalChecks;

        // ✅ Check if all predefined due diligence checks are completed
        const predefinedChecksComplete = Object.values(dueDiligenceFields).every(status => status === "completed");

        // ✅ Check if all additional due diligence checks are completed
        const additionalChecksComplete = additionalChecks.every(check => check.status === "completed");

        // ✅ Overall validation: both predefined and additional checks must be completed
        const allCompleted = predefinedChecksComplete && additionalChecksComplete;

        res.json({
            isComplete: allCompleted,
            message: allCompleted ? "Due diligence is complete" : "Some checks are still pending"
        });
    } catch (error) {
        console.error("Error validating due diligence:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});

router.post('/', authMiddleware, authorize(['view_property']), async (req, res) => {
    try {
        // Sanitize incoming data and attach the logged-in user's id as createdBy
        const sanitizedData = {
            ...req.body,
            createdBy: req.user._id,
            videoAvailableDate: parseDateOrNull(req.body.videoAvailableDate),
            upcomingInspectionDate: parseDateOrNull(req.body.upcomingInspectionDate),
            additionalDocsExpected: parseDateOrNull(req.body.additionalDocsExpected),
            followUpTasks: Array.isArray(req.body.followUpTasks)
                ? req.body.followUpTasks.map(task => ({
                      task: task.task,
                      followUpDate: parseDateOrNull(task.followUpDate),
                      reason: task.reason,
                      completed: task.completed || false,
                  }))
                : [],
        };

        // Create new property
        const property = new Property(sanitizedData);
        await property.save();

        // 🔍 Match against private client briefs belonging to this agent
        const briefs = await ClientBrief.find({ buyerAgentId: req.user._id });

        const matches = briefs.map(brief => ({
            brief,
            result: propertyMatchesClientBrief(property, brief)
        }));
        
        const matchedBriefs = matches.filter(m => m.result.isMatch);
        
        if (matchedBriefs.length > 0) {
            console.log(`✅ Property matches ${matchedBriefs.length} client brief(s).`);
            matchedBriefs.forEach(({ brief, result }) => {
                console.log(`➡️ ${brief.clientName} | Match Score: ${result.matchScore}%`);
            });
        }

        // Populate the createdBy field with selected fields
        await property.populate('createdBy', 'name email phoneNumber');

        res.status(201).json(property);
    } catch (error) {
        console.error('Error creating property:', error);
        if (error.name === 'ValidationError') {
            res.status(400).json({ message: 'Validation error', details: error.errors });
        } else {
            res.status(500).json({ message: 'Internal Server Error', error: error.message });
        }
    }
});


router.get('/community', authMiddleware, async (req, res) => {
    try {
      const properties = await Property.find({
        isCommunityShared: true,
        is_deleted: false, 
        sharedBy: { $ne: null }
      })
      .populate('sharedBy', 'name email');
  
      const sanitized = properties.map((prop) => {
        const obj = prop.toObject();
        delete obj.agentId; // 👈 Remove agent data
        return obj;
      });
  
      res.json(sanitized);

    } catch (error) {
      console.error('Error fetching community properties:', error);
      res.status(500).json({ message: 'Error fetching community properties.' });
    }
  });
  


router.get('/', authMiddleware, authorize(['view_property']),async (req, res) => {
    try {
        const currentUserId = req.user._id;
        console.log("currentUserId-->", currentUserId);

        let properties;
        if (req.user.role === 'admin') {
            // Admin: Return all properties without privacy filters
            properties = await Property.find().populate('agentId', 'name email phoneNumber');
        } else {
            // Non-admin: Filter properties based on privacy rules:
            // 1. publicListing is true, OR
            // 2. createdBy equals the current user, OR
            // 3. sharedWith includes the current user.
            properties = await Property.find({
                $or: [
                    { publicListing: true },
                    { createdBy: currentUserId },
                    { sharedWith: currentUserId }
                ]
            }).populate('agentId', 'name email phoneNumber');
        }

        console.log("Fetched properties:", properties);

        let sanitizedProperties;
        if (req.user.role === 'admin') {
            // Admins see all details as-is
            sanitizedProperties = properties;
        } else {
            // Non-admin users: hide address if showAddress is false and user is not owner/shared
            sanitizedProperties = properties.map(property => {
                const propObj = property.toObject();
                const isOwner = String(propObj.createdBy) === String(currentUserId);
                const isShared = propObj.sharedWith && propObj.sharedWith.some(id => String(id) === String(currentUserId));
                if (!propObj.showAddress && !isOwner && !isShared) {
                    propObj.address = "Address Hidden";
                }
                return propObj;
            });
        }

        res.status(200).json(sanitizedProperties);
    } catch (error) {
        console.error('Error fetching properties:', error);
        res.status(500).json({ message: 'Error fetching properties.' });
    }
});

// ✅ PATCH: Update Property Status
router.patch('/:id/status', authMiddleware, authorize(['edit_property']), async (req, res) => {
    try {
        const { status } = req.body;

        if (!['available', 'sold', 'offer_accepted'].includes(status)) {
            return res.status(400).json({ message: "Invalid status value" });
        }

        const property = await Property.findById(req.params.id);
        if (!property) {
            return res.status(404).json({ message: "Property not found" });
        }

        // Only allow edits if not "offer_accepted" OR if admin
        if (property.currentStatus === "offer_accepted" && req.user.role !== "admin") {
            return res.status(403).json({ message: "Only admins can modify an accepted offer" });
        }

        property.currentStatus = status;
        await property.save();

        res.json({ message: "Property status updated successfully", property });
    } catch (error) {
        console.error("Error updating property status:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});





// Generate share link for a property
router.post('/:id/share', authMiddleware,  authorize(['share_property']), async (req, res) => {

    try {
        // console.log ("I am here")
        const property = await Property.findById(req.params.id);
        if (!property) {
            return res.status(404).json({ message: 'Property not found.' });
        }
        // Ensure that only the owner can generate a share link
        if (property.createdBy.toString() !== req.user._id.toString() ) {
            return res.status(403).json({ message: 'You are not authorized to share this property.' });
        }
        // Generate a share token if it doesn't exist
        if (!property.shareToken) {
            property.shareToken = crypto.randomBytes(16).toString('hex');
            await property.save();
        }
        // Build the share link. Make sure to define FRONTEND_URL in your environment variables.
        const shareLink = `${process.env.FRONTEND_URL}/shared/${property.shareToken}`;
        res.status(200).json({ shareLink });
    } catch (error) {
        console.error('Error generating share link:', error);
        res.status(500).json({ message: 'Error generating share link.' });
    }
});


// routes/propertyRoutes.js (continued)
router.get('/shared/:shareToken', async (req, res) => {
    try {
        const property = await Property.findOne({ shareToken: req.params.shareToken })
            .populate('agentId', 'name email phoneNumber')
            .populate('createdBy', 'name email');
        if (!property) {
            return res.status(404).json({ message: 'Property not found or link expired.' });
        }
        // Optionally sanitize details (e.g., hide address if showAddress is false for non-owners)
        // For public viewing, you might simply send all non-sensitive info.
        res.status(200).json(property);
    } catch (error) {
        console.error('Error retrieving shared property:', error);
        res.status(500).json({ message: 'Error retrieving property.' });
    }
});



// Get conversations for a property
router.get('/:id/conversations', authMiddleware,authorize(['view_conversations']),async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);

        if (!property) {
            return res.status(404).json({ message: 'Property not found.' });
        }

        res.status(200).json(property.conversation || []);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ message: 'Error fetching conversations.' });
    }
});

// Add notes on property.
router.post('/:id/notes', authMiddleware,authorize(['create_notes']), async (req, res) => {
    try {
        const { content } = req.body;
        const property = await Property.findById(req.params.id);
        if (!property) return res.status(404).json({ message: 'Property not found' });

        const newNote = { content, timestamp: new Date() };
        property.notes.push(newNote);
        await property.save();

        res.status(201).json(newNote);
    } catch (error) {
        console.error('Error adding note:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


router.get('/:id/notes',  authMiddleware,authorize(['get_notes']), async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if (!property) return res.status(404).json({ message: 'Property not found' });

        res.json(property.notes || []);
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ message: 'Server error' });
    }
});





// Get a single property by ID
router.get('/:id',  authMiddleware,authorize(['view_property']), async (req, res) => {
    try {
        const property = await Property.findById(req.params.id).populate('agentId', 'name email phoneNumber');
        if (!property) {
            return res.status(404).json({ message: 'Property not found.' });
        }
        res.status(200).json(property);
    } catch (error) {
        console.error('Error fetching property:', error);
        res.status(500).json({ message: 'Error fetching property.' });
    }
});

// Update a property by ID
router.put('/:id',  authMiddleware,authorize(['update_property']), async (req, res) => {
    try {
        const { id } = req.params;

        // Find and update the property
        const updatedProperty = await Property.findByIdAndUpdate(
            id,
            req.body, // Update fields from request body
            { new: true, runValidators: true } // Return updated property & validate
        ).populate('agentId', 'name email phoneNumber'); // Populate agent details

        if (!updatedProperty) {
            return res.status(404).json({ message: 'Property not found.' });
        }

        res.status(200).json(updatedProperty);
    } catch (error) {
        console.error('Error updating property:', error);
        res.status(500).json({ message: 'Error updating property.' });
    }
});


// Delete a property by ID
router.delete('/:id',  authMiddleware,authorize(['delete_property']),async (req, res) => {
    try {
        const property = await Property.findByIdAndDelete(req.params.id);
        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }
        res.status(200).json({ message: 'Property deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting property', error });
    }
});

// Soft delete a property
router.patch('/:id/delete',  authMiddleware,authorize(['update_property']),async (req, res) => {
    try {
        const updatedProperty = await Property.findByIdAndUpdate(
            req.params.id,
            { is_deleted: true, deleted_at: new Date() },
            { new: true, runValidators: true }
        );

        if (!updatedProperty) {
            return res.status(404).json({ message: 'Property not found.' });
        }

        res.status(200).json({ message: `Property ${req.params.id} marked as deleted.`, updatedProperty });
    } catch (error) {
        console.error('Error marking property as deleted:', error);
        res.status(500).json({ message: 'Error marking property as deleted.' });
    }
});

// Restore a soft-deleted property
router.patch('/:id/restore', authMiddleware, authorize(['restore_property']), async (req, res) => {
    try {
        const updatedProperty = await Property.findByIdAndUpdate(
            req.params.id,
            { is_deleted: false, deleted_at: null },
            { new: true, runValidators: true }
        );

        if (!updatedProperty) {
            return res.status(404).json({ message: 'Property not found.' });
        }

        res.status(200).json({ message: `Property ${req.params.id} restored.`, updatedProperty });
    } catch (error) {
        console.error('Error restoring property:', error);
        res.status(500).json({ message: 'Error restoring property.' });
    }
});


// // Soft delete a property
// router.patch("/:id/delete", async (req, res) => {
//     const { id } = req.params;
//     await Property.update(
//         { is_deleted: true, deleted_at: new Date() },
//         { where: { id } }
//     );
//     res.json({ message: `Property ${id} marked as deleted.` });
// });

// // Restore a soft-deleted property
// router.patch("/:id/restore", async (req, res) => {
//     const { id } = req.params;
//     await Property.update(
//         { is_deleted: false, deleted_at: null },
//         { where: { id } }
//     );
//     res.json({ message: `Property ${id} restored.` });
// });


// Update decisionStatus for a property
router.patch('/:id/decision',authMiddleware, async (req, res) => {
    try {
        const { decisionStatus } = req.body;
        if (!["undecided", "pursue", "on_hold"].includes(decisionStatus)) {
            return res.status(400).json({ message: "Invalid decision status." });
        }

        const property = await Property.findByIdAndUpdate(
            req.params.id,
            { decisionStatus },
            { new: true }
        );

        if (!property) {
            return res.status(404).json({ message: "Property not found." });
        }

        res.status(200).json(property);
    } catch (error) {
        console.error("Error updating decision status:", error);
        res.status(500).json({ message: "Failed to update decision status." });
    }
});




// Twilio Configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Send SMS to agent
router.post('/:id/send-sms',  authMiddleware,authorize(['send_sms']), async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;

        const property = await Property.findById(id).populate('agentId');
        if (!property || !property.agentId || !property.agentId.phoneNumber) {
            return res.status(404).json({ message: 'Agent phone number not found.' });
        }

        const sms = await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: property.agentId.phoneNumber,
        });

        // Save the SMS in the property's conversations
        property.conversations.push({
            message: `SMS Sent: ${message}`,
            timestamp: new Date(),
        });
        await property.save();

        res.status(200).json({ message: 'SMS sent successfully.', sms });
    } catch (error) {
        console.error('Error sending SMS:', error);
        res.status(500).json({ message: 'Error sending SMS.' });
    }
});




module.exports = router;

