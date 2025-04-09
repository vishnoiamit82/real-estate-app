const express = require('express');
const router = express.Router();
const axios = require('axios');
const Property = require('../models/Property');
const AISearchQuery = require('../models/AISearchQuery');
const Tag = require('../models/Tags');




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
- subdivisionPotential ( boolean, true or false)


### 🏷️ Text / Lists
- propertyType (string): Return propertyType only from this list mentioned: [ house, apartment, townhouse, duplex ]

- mustHaveTags (array): Choose only from this list. Only return a tag if the query contains **an exact or close synonym** (not vague associations).  
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
      query.isCommunityShared = true;
    } else {
      query.$or = [
        { isCommunityShared: true },
        { createdBy: req.user._id }
      ];
    }
  
    const isValidNumber = (value) =>
        (typeof value === 'number' || typeof value === 'string') &&
        !isNaN(Number(value));
      
    const isValidString = (val) => typeof val === 'string' && val.trim() && val.trim().toLowerCase() !== 'any';
    const isValidArray = (arr) => Array.isArray(arr) && arr.length > 0;
  
    if (isValidNumber(filters.bedrooms)) query.bedrooms = { $gte: Number(filters.bedrooms) };
    if (isValidNumber(filters.bathrooms)) query.bathrooms = { $gte: Number(filters.bathrooms) };
    if (isValidNumber(filters.carSpaces)) query.carSpaces = { $gte: Number(filters.carSpaces) };
  
    if (isValidString(filters.propertyType)) query.propertyType = filters.propertyType;
  
    if (isValidNumber(filters.minPrice)) query.askingPriceMax = { $gte: Number(filters.minPrice) };
    if (isValidNumber(filters.maxPrice)) query.askingPriceMin = { $lte: Number(filters.maxPrice) };
  
    if (isValidNumber(filters.minRent) || isValidNumber(filters.maxRent)) {
      query.rentPerWeek = {};
      if (isValidNumber(filters.minRent)) query.rentPerWeek.$gte = Number(filters.minRent);
      if (isValidNumber(filters.maxRent)) query.rentPerWeek.$lte = Number(filters.maxRent);
    }
  
    if (isValidNumber(filters.rentalYieldMin) || isValidNumber(filters.rentalYieldMax)) {
      query.rentalYieldPercent = {};
      if (isValidNumber(filters.rentalYieldMin)) query.rentalYieldPercent.$gte = Number(filters.rentalYieldMin);
      if (isValidNumber(filters.rentalYieldMax)) query.rentalYieldPercent.$lte = Number(ilters.rentalYieldMax);
    }
  
    if (isValidNumber(filters.landSizeMin)) query.landSizeSqm = { $gte: Number(filters.landSizeMin) };
  
    if (isValidNumber(filters.yearBuiltMin)) query.yearBuiltNumeric = { $gte: Number(filters.yearBuiltMin) };
  
    // if (isValidArray(filters.locations)) {
    //   query.address = { $regex: filters.locations.join('|'), $options: 'i' };
    // }
  
    if (filters.isOffmarket !== undefined) query.isOffmarket = filters.isOffmarket;
    if (filters.subdivisionPotential !== undefined) query.subdivisionPotential = filters.subdivisionPotential;
  
    if (isValidString(filters.zoningType)) {
      query.zoningType = { $regex: filters.zoningType, $options: 'i' };
    }
  
    const regexOrIn = (field, value) => {
        if (Array.isArray(value)) {
          const values = value
            .map(v => (typeof v === 'string' ? v : v?.name))
            .filter(Boolean); // remove undefined/null
      
          if (values.length > 0) {
            query[field] = { $in: values.map(v => new RegExp(v, 'i')) };
          }
        } else if (typeof value === 'string' && value.trim()) {
          query[field] = { $regex: value, $options: 'i' };
        }
      };
      
  
    regexOrIn("floodZone", filters.floodZone);
    regexOrIn("bushfireZone", filters.bushfireZone);
    regexOrIn("propertyCondition", filters.propertyCondition);
    regexOrIn("features", filters.features);
    regexOrIn("tags.name", filters.tags);
  
    if (filters.publicListing !== undefined) query.publicListing = filters.publicListing;
  
    if (filters.videosRequired) {
      query.videos = { $exists: true, $not: { $size: 0 } };
    }
  
    if (filters.documentsRequired) {
      query.documents = { $exists: true, $not: { $size: 0 } };
    }
  
    if (filters.dueDiligence) {
      regexOrIn("dueDiligence.floodZone", filters.dueDiligence.floodZone);
      regexOrIn("dueDiligence.bushfireZone", filters.dueDiligence.bushfireZone);
      regexOrIn("dueDiligence.socialHousing", filters.dueDiligence.socialHousing);
    }
  
    console.log("Mongo DB query", query);
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



router.get('/property/tags', async (req, res) => {
  try {
    const tags = await Tag.find({}, { _id: 0, name: 1, type: 1 }).sort({ name: 1 }); // Get only name + type
    res.json(tags);
  } catch (err) {
    console.error("Error fetching tags:", err);
    res.status(500).json({ message: "Failed to retrieve tags." });
  }
});

  

  

  
  module.exports = router;
