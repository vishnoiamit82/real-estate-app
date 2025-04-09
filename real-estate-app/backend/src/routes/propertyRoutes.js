const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const { authMiddleware, authorize } = require('../middlewares/authMiddleware'); // Ensure you have this middleware
const crypto = require('crypto');
const ClientBrief = require('../models/ClientBriefs');
const propertyMatchesClientBrief = require('../utils/propertyMatchesClientBrief');
// const extractSingleNumber = require('../utils/extractSingleNumber');


const twilio = require('twilio');


const parsePriceRange = (text) => {
    const numbers = text.match(/\d[\d,]*/g);
    if (!numbers) return { min: null, max: null };

    const [minStr, maxStr] = numbers.map(n => Number(n.replace(/,/g, '')));
    return {
        min: minStr || null,
        max: maxStr || minStr || null,
    };
};

const parseRent = (text) => {
    const match = text.match(/\d[\d,]*/);
    return match ? Number(match[0].replace(/,/g, '')) : null;
};

const parseYield = (text) => {
    const match = text.match(/(\d+(\.\d+)?)%/);
    return match ? parseFloat(match[1]) : null;
};


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

        if (!property.shareToken) {
            property.shareToken = crypto.randomBytes(16).toString('hex');
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

// router.post('/properties/:id/add-document', authMiddleware, async (req, res) => {
//     const { name, url } = req.body;
//     const property = await Property.findById(req.params.id);
//     if (!property) return res.status(404).json({ message: 'Property not found' });
  
//     property.documents.push({ name, url });
//     await property.save();
  
//     res.json({ message: 'Document added', documents: property.documents });
//   });


//   router.post('/properties/:id/add-video', authMiddleware, async (req, res) => {
//     const { title, url } = req.body;
//     const property = await Property.findById(req.params.id);
//     if (!property) return res.status(404).json({ message: 'Property not found' });
  
//     property.videos.push({ title, url });
//     await property.save();
  
//     res.json({ message: 'Video added', videos: property.videos });
//   });
  
  

router.post('/', authMiddleware, authorize(['view_property']), async (req, res) => {
    try {
        // 🔢 Parse numeric values from price, rent, and yield fields

        const parsePriceRange = (text) => {
            const cleaned = text.toLowerCase();
            const numbers = text.match(/\d[\d,]*/g);

            if (!numbers) return { min: null, max: null };

            const [num1, num2] = numbers.map(n => Number(n.replace(/,/g, '')));

            if (cleaned.includes("over")) {
                return { min: num1, max: null };
            } else if (cleaned.includes("under") || cleaned.includes("up to")) {
                return { min: null, max: num1 };
            } else if (cleaned.includes("from")) {
                return { min: num1, max: num2 || null };
            } else if (numbers.length === 2) {
                return { min: num1, max: num2 };
            } else {
                return { min: num1, max: num1 }; // fallback: single price
            }
        };


        function extractSingleNumber(text) {
            if (!text || typeof text !== 'string') return null;

            const sanitized = text.replace(/[$,%]/g, '').toLowerCase();

            // Match the first number (integer or decimal)
            const match = sanitized.match(/\d+(\.\d+)?/);

            if (!match) return null;

            return Number(match[0]);
        }


        const parseRent = (text) => {
            const match = text.match(/\d[\d,]*/);
            return match ? Number(match[0].replace(/,/g, '')) : null;
        };

        const parseYield = (text) => {
            const match = text.match(/(\d+(\.\d+)?)%/);
            return match ? parseFloat(match[1]) : null;
        };


        // Extract and calculate numeric values from free-text fields
        const { askingPrice, rental, rentalYield, landSize, yearBuilt } = req.body;
        const { min, max } = parsePriceRange(askingPrice || '');
        const rentPerWeek = parseRent(rental || '');
        const rentalYieldPercent = parseYield(rentalYield || '');
        const landSizeNumeric = extractSingleNumber(landSize || '')
        const yearBuiltNumeric = extractSingleNumber(yearBuilt || '')

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
            askingPriceMin: min,
            askingPriceMax: max,
            rentPerWeek,
            rentalYieldPercent,
            landSizeNumeric,
            yearBuiltNumeric
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

router.get('/community', async (req, res) => {
    try {
      const {
        posted_within_days,
        include_deleted,
        page = 1,
        limit = 20,
      } = req.query;
  
      const query = {
        isCommunityShared: true,
        sharedBy: { $ne: null },
      };
  
      // Filter deleted
      if (include_deleted !== 'true') {
        query.is_deleted = false;
      }
  
      // Filter by date
      if (posted_within_days && !isNaN(posted_within_days)) {
        const days = parseInt(posted_within_days, 10);
        const since = new Date();
        since.setDate(since.getDate() - days);
        query.createdAt = { $gte: since };
      }
  
      const skip = (parseInt(page) - 1) * parseInt(limit);
  
      const [properties, total] = await Promise.all([
        Property.find(query)
          .populate('sharedBy', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
  
        Property.countDocuments(query),
      ]);
  
      const sanitized = properties.map((prop) => {
        const obj = prop.toObject();
        delete obj.agentId;
        return obj;
      });
  
      res.json({
        data: sanitized,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
      });
    } catch (error) {
      console.error('Error fetching community properties:', error);
      res.status(500).json({ message: 'Error fetching community properties.' });
    }
  });
  
  
  router.get('/', authMiddleware, authorize(['view_property']), async (req, res) => {
    try {
      const currentUserId = req.user._id;
      const { mine, status, is_deleted, page, limit } = req.query;
  
      let query = {};
  
      // ✅ Apply is_deleted filter (defaults to false)
      if (is_deleted === 'true') {
        query.is_deleted = true;
      } else if (is_deleted === 'false' || !is_deleted) {
        query.is_deleted = false;
      }
  
      // 🔐 Filter only own properties if mine=true
      if (mine === 'true') {
        query.createdBy = currentUserId;
      } else if (req.user.role !== 'admin') {
        query.$or = [
          { publicListing: true },
          { createdBy: currentUserId },
          { sharedWith: currentUserId },
        ];
      }
  
      // 🟡 Apply decisionStatus filter if provided
      if (status) {
        const statusArray = status.split(',').map(s => s.trim());
        query.decisionStatus = { $in: statusArray };
      }
  
      console.log('Final Query:', query);
  
      const shouldPaginate = page && limit;
      let properties, total;
  
      if (shouldPaginate) {
        const parsedPage = parseInt(page, 10);
        const parsedLimit = parseInt(limit, 10);
        const skip = (parsedPage - 1) * parsedLimit;
  
        [properties, total] = await Promise.all([
          Property.find(query)
            .populate('agentId', 'name email phoneNumber')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parsedLimit),
          Property.countDocuments(query),
        ]);
      } else {
        properties = await Property.find(query)
          .populate('agentId', 'name email phoneNumber')
          .sort({ createdAt: -1 });
      }
  
      const sanitized = req.user.role === 'admin'
        ? properties
        : properties.map((property) => {
            const prop = property.toObject();
            const isOwner = String(prop.createdBy) === String(currentUserId);
            const isShared = prop.sharedWith?.some(id => String(id) === String(currentUserId));
            if (!prop.showAddress && !isOwner && !isShared) {
              prop.address = 'Address Hidden';
            }
            return prop;
          });
  
      if (shouldPaginate) {
        const parsedPage = parseInt(page, 10);
        const parsedLimit = parseInt(limit, 10);
        return res.json({
          data: sanitized,
          total,
          page: parsedPage,
          totalPages: Math.ceil(total / parsedLimit),
        });
      }
  
      return res.json(sanitized);
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
router.post('/:id/share', authMiddleware, authorize(['share_property']), async (req, res) => {

    try {
        // console.log ("I am here")
        const property = await Property.findById(req.params.id);
        if (!property) {
            return res.status(404).json({ message: 'Property not found.' });
        }
        // Ensure that only the owner can generate a share link
        if (property.createdBy.toString() !== req.user._id.toString()) {
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
router.get('/:id/conversations', authMiddleware, authorize(['view_conversations']), async (req, res) => {
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
router.post('/:id/notes', authMiddleware, authorize(['create_notes']), async (req, res) => {
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


router.get('/:id/notes', authMiddleware, authorize(['get_notes']), async (req, res) => {
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
router.get('/:id', authMiddleware, authorize(['view_property']), async (req, res) => {
    try {
        const property = await Property.findById(req.params.id).populate('agentId', 'name email phoneNumber');
        if (!property) {
            return res.status(404).json({ message: 'Property not found.' });
        }
        res.status(200).json(property.toObject());
    } catch (error) {
        console.error('Error fetching property:', error);
        res.status(500).json({ message: 'Error fetching property.' });
    }
});

// Update a property by ID
router.put('/:id', authMiddleware, authorize(['update_property']), async (req, res) => {
    try {
        console.log("Incoming update payload:", req.body);
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
router.delete('/:id', authMiddleware, authorize(['delete_property']), async (req, res) => {
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
router.patch('/:id/delete', authMiddleware, authorize(['update_property']), async (req, res) => {
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
router.patch('/:id/decision', authMiddleware, async (req, res) => {
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
router.post('/:id/send-sms', authMiddleware, authorize(['send_sms']), async (req, res) => {
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

