const express = require('express');
const router = express.Router();
const axios = require('axios');
const Property = require('../models/Property');
const AISearchQuery = require('../models/AISearchQuery');




// Helper: Build GPT prompt from user query
const buildSearchPrompt = (query) => `
You are a real estate assistant. A user is searching for a property using this natural language query:

"${query}"

Your job is to convert this into structured **MongoDB-compatible filters** as a JSON object.

Return only the following fields if they are explicitly stated:

### 🔢 Numbers
- minPrice (number)
- maxPrice (number)
- minRent (number)
- maxRent (number)
- rentalYieldMin (number)
- rentalYieldMax (number)
- bedrooms (number)
- bathrooms (number)
- carSpaces (number)
- landSizeMin (number, in sqm)
- yearBuiltMin (number)

### 🏷️ Text / Lists
- propertyType (string)
mustHaveTags (array): Choose only from this list. Only return a tag if the query contains **an exact or close synonym** (not vague associations).  
  Do NOT return tags based on inferred investment context (e.g., SMSF, yield, capital growth).  
  Only include a tag if words like “renovation”, “needs work”, “granny flat”, etc., are clearly mentioned.
  ["Recently Renovated", "Needs Renovation", "Subdivision Potential", "Plans & Permits", "Granny Flat", "Dual Living", "Zoned for Development"]
  Example: Query "SMSF properties" → do NOT return any tags, unless the user also says "renovation" or similar.
- locations (array of suburb or region names)

### 🧠 Notes:
- If price is "around $XXX", set minPrice = XXX - 20000 and maxPrice = XXX + 20000
- If the user **explicitly** mentions "reno", "renovation", "flipping", "fixer upper", "needs work", then return "Needs Renovation". Do NOT infer based on investment language like SMSF, strategy, or potential.
- If user mentions "no flooding", "not flood prone", set floodZone = "none"
- Convert acres or hectares to sqm if needed for land size

Do NOT guess missing data.
Return clean, valid JSON only with no explanations.
`;



// Helper: Build MongoDB query from filters
const buildMongoQuery = (req, filters) => {

    const query = {
        is_deleted: false
      };
      
      if (!req.user?._id) {
        // Public access: only community-shared
        query.isCommunityShared = true;
      } else {
        // Authenticated user: show public or personally created
        query.$or = [
          { isCommunityShared: true },
          { createdBy: req.user._id }
        ];
      }
      
  const isValidNumber = (value) => typeof value === 'number' && !isNaN(value);

  if (isValidNumber(filters.bedrooms)) query.bedrooms = { $gte: filters.bedrooms };
  if (isValidNumber(filters.bathrooms)) query.bathrooms = { $gte: filters.bathrooms };
  if (isValidNumber(filters.carSpaces)) query.carSpaces = { $gte: filters.carSpaces };
  
  if (filters.propertyType) query.propertyType = filters.propertyType;

  if (filters.minPrice) query.askingPriceMax = { $gte: filters.minPrice };
  if (filters.maxPrice) query.askingPriceMin = { $lte: filters.maxPrice };

  if (filters.minRent || filters.maxRent) {
    query.rentPerWeek = {};
    if (filters.minRent) query.rentPerWeek.$gte = filters.minRent;
    if (filters.maxRent) query.rentPerWeek.$lte = filters.maxRent;
  }

  if (filters.rentalYieldMin || filters.rentalYieldMax) {
    query.rentalYieldPercent = {};
    if (filters.rentalYieldMin) query.rentalYieldPercent.$gte = filters.rentalYieldMin;
    if (filters.rentalYieldMax) query.rentalYieldPercent.$lte = filters.rentalYieldMax;
  }

  if (filters.landSizeMin) query.landSizeSqm = { $gte: filters.landSizeMin };

  if (filters.yearBuiltMin) query.yearBuiltNumeric = { $gte: filters.yearBuiltMin };

  if (filters.mustHaveTags?.length) {
    query.tags = { $in: filters.mustHaveTags.map(tag => new RegExp(tag, 'i')) };
  }

  if (filters.locations?.length) {
    query.address = { $regex: filters.locations.join('|'), $options: 'i' };
  }

  if (filters.isOffmarket !== undefined) {
    query.isOffmarket = filters.isOffmarket;
  }
  
  if (filters.subdivisionPotential !== undefined) {
    query.subdivisionPotential = filters.subdivisionPotential;
  }
  
  if (filters.zoningType) {
    query.zoningType = { $regex: filters.zoningType, $options: 'i' };
  }
  
  if (filters.floodZone) {
    query.floodZone = { $regex: filters.floodZone, $options: 'i' };
  }
  
  if (filters.bushfireZone) {
    query.bushfireZone = { $regex: filters.bushfireZone, $options: 'i' };
  }
  
  if (filters.propertyCondition) {
    query.propertyCondition = { $regex: filters.propertyCondition, $options: 'i' };
  }
  
  if (filters.features?.length) {
    query.features = { $in: filters.features };
  }
  
  if (filters.tags?.length) {
    query.tags = { $in: filters.tags };
  }
  
  if (filters.publicListing !== undefined) {
    query.publicListing = filters.publicListing;
  }
  
  if (filters.videosRequired) {
    query.videos = { $exists: true, $not: { $size: 0 } };
  }
  
  if (filters.documentsRequired) {
    query.documents = { $exists: true, $not: { $size: 0 } };
  }
  
  // Due diligence nested object
  if (filters.dueDiligence?.floodZone) {
    query["dueDiligence.floodZone"] = { $regex: filters.dueDiligence.floodZone, $options: 'i' };
  }
  if (filters.dueDiligence?.bushfireZone) {
    query["dueDiligence.bushfireZone"] = { $regex: filters.dueDiligence.bushfireZone, $options: 'i' };
  }
  if (filters.dueDiligence?.socialHousing) {
    query["dueDiligence.socialHousing"] = { $regex: filters.dueDiligence.socialHousing, $options: 'i' };
  }

  console.log ("Mongo DB query", query)

  return query;
};

  

// Main route
router.post('/ai-search-preview', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ message: 'Search query is required.' });

  try {
    // 1. Prepare and send GPT request
    const prompt = buildSearchPrompt(query);

    const gptRes = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that extracts search filters from real estate queries.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log ("chatgpt response", gptRes.data.choices)

    let parsedFilters = gptRes.data.choices[0].message.content.replace(/```json|```/g, '');
    parsedFilters = JSON.parse(parsedFilters);

    // 2. Save user query to DB
    await AISearchQuery.create({
      userId: req.user?._id || null,
      rawQuery: query,
      parsedFilters
    });

    // 3. Build and run MongoDB query
    // const mongoQuery = buildMongoQuery(req, parsedFilters);
    // const results = await Property.find(mongoQuery).limit(30).lean();

    // 4. Respond
    res.status(200).json({ parsedFilters });

  } catch (err) {
    console.error('AI search error:', err.response?.data || err.message);
    res.status(500).json({ message: 'Error processing search query.' });
  }
});

router.post('/property/search', async (req, res) => {
    const filters = req.body;

    console.log (filters)
  
    try {
      const mongoQuery = buildMongoQuery(req, filters); // Use your existing utility
      console.log ("mongoQuery", mongoQuery)
      const results = await Property.find(mongoQuery).limit(30).lean();
      res.status(200).json({ results });
    } catch (err) {
      console.error('Property search error:', err);
      res.status(500).json({ message: 'Error processing property search.' });
    }
  });
  


  
  module.exports = router;
