const express = require('express');
const router = express.Router();
const ClientBrief = require('../models/ClientBriefs');
const Property = require('../models/Property');
const { calculateMatchScore } = require('../utils/calculateMatchScore');

// const matches = properties.map(property => {
//   const result = calculateMatchScore(property, clientBrief);
//   return { property, ...result };
// });


// Create a new client brief
router.post('/', async (req, res) => {
    try {
      const userId = req.user._id;
      const { buyerAgentId, ...rest } = req.body;
  
      const clientBrief = new ClientBrief({
        ...rest,
        buyerAgentId: buyerAgentId || userId,  // Fallback if user is buyer agent
        createdBy: userId,
        invitedBy: req.body.invitedBy || null,
      });
  
      await clientBrief.save();
      res.status(201).json(clientBrief);
    } catch (error) {
      console.error('Error creating client brief:', error);
      res.status(500).json({ message: 'Error creating client brief.' });
    }
  });
  
  

// Fetch all client briefs for a buyers' agent
router.get('/', async (req, res) => {
    try {
      const userId = req.user._id;
      const isAdmin = req.user.role === 'admin';
  
      const query = isAdmin ? {} : {
        $or: [
          { createdBy: userId },
          { buyerAgentId: userId },
          { invitedBy: userId }
        ]
      };
  
      const briefs = await ClientBrief.find(query);
      res.status(200).json(briefs);
    } catch (error) {
      console.error('Error fetching client briefs:', error);
      res.status(500).json({ message: 'Error fetching client briefs.' });
    }
  });
  
  

// Fetch a single client brief by ID
router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;
  
      const brief = await ClientBrief.findById(id);
      if (!brief) return res.status(404).json({ message: 'Client brief not found' });
  
      if (
        brief.createdBy.toString() !== userId.toString() &&
        brief.buyerAgentId.toString() !== userId.toString() &&
        (brief.invitedBy && brief.invitedBy.toString() !== userId.toString()) &&
        req.user.role !== 'admin'
      ) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
  
      res.status(200).json(brief);
    } catch (error) {
      console.error('Error fetching client brief:', error);
      res.status(500).json({ message: 'Error fetching client brief' });
    }
  });
  
  
  

// Update an existing client brief by ID
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updatedClientBrief = await ClientBrief.findByIdAndUpdate(id, req.body, {
            new: true, // Return the updated document
            runValidators: true, // Ensure validation rules are applied
        });

        if (!updatedClientBrief) {
            return res.status(404).json({ message: 'Client brief not found.' });
        }

        res.status(200).json(updatedClientBrief);
    } catch (error) {
        console.error('Error updating client brief:', error);
        res.status(500).json({ message: 'Error updating client brief.' });
    }
});



// Get matched properties for a client brief
router.get('/:id/matches', async (req, res) => {
    try {
      const clientBrief = await ClientBrief.findById(req.params.id);
      if (!clientBrief) return res.status(404).json({ message: 'Client brief not found.' });
  
      // Only fetch properties created by user OR shared with community
      const properties = await Property.find({
        $or: [
          { createdBy: req.user.id },
          { isCommunityShared: true }
        ]
      });
  
      const matches = properties.map(property => {
        const {
          score,
          scoreDetails,
          maxScore,
          rawScore,
          penalties,
          matchTier,
          matchedTags,
          unmatchedCriteria,
          estimatedHoldingCost,
          netMonthlyHoldingCost,
          holdingCostBreakdown,
          warnings,
          calculationInputs
          
        } = calculateMatchScore(property, clientBrief);
      
        return {
          property,
          score,
          scoreDetails,
          rawScore,
          maxScore,
          penalties,
          matchTier,
          matchedTags,
          unmatchedCriteria,
          estimatedHoldingCost,
          netMonthlyHoldingCost,
          holdingCostBreakdown,
          warnings,
          calculationInputs
        };
      });
      
  
      res.status(200).json(matches);
    } catch (error) {
      console.error('Error fetching matches:', error);
      res.status(500).json({ message: 'Error fetching matches.' });
    }
  });





// Delete a client brief by ID
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedBrief = await ClientBrief.findByIdAndDelete(id);

        if (!deletedBrief) {
            return res.status(404).json({ message: 'Client brief not found.' });
        }

        res.status(200).json({ message: 'Client brief deleted successfully.' });
    } catch (error) {
        console.error('Error deleting client brief:', error);
        res.status(500).json({ message: 'Error deleting client brief.' });
    }
});


module.exports = router;
