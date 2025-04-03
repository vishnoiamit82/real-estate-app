const express = require('express');
const router = express.Router();
const axios = require('axios');
const Property = require('../models/Property');
const AISearchQuery = require('../models/AISearchQuery');


// Helper: Build GPT prompt from user query
const buildSearchPrompt = (query) => `
You are a real estate assistant. A user is searching for a property using this query:  
"${query}"

Your job is to extract structured **search filters** from the query and return a valid JSON object.

Return only the fields clearly mentioned in the query:

- bedrooms (number or null)
- bathrooms (number or null)
- carSpaces (number or null)
- propertyType (string or null)
- minPrice (number or null)
if the price says around $xx then reduce min price by 20,000
- maxPrice (number or null)
if the price says around $xx then increase max price by 20,000
- minRent (number or null)
- maxRent (number or null)
- rentalYieldMin (number or null)
- rentalYieldMax (number or null)
- landSizeMin (number or null)
- yearBuiltMin (number or null)
- mustHaveTags (array of strings): Choose from:
  ["Recently Renovated", "Needs Renovation", "Subdivision Potential", "Plans & Permits", "Granny Flat", "Dual Living", "Zoned for Development"]
- locations (array of strings)

🚨 Do NOT infer vague details. Return only clean JSON with explicitly stated filters.
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

  if (isValidNumber(filters.bedrooms)) mongoQuery.bedrooms = { $gte: filters.bedrooms };
  if (isValidNumber(filters.bathrooms)) mongoQuery.bathrooms = { $gte: filters.bathrooms };
  if (isValidNumber(filters.carSpaces)) mongoQuery.carSpaces = { $gte: filters.carSpaces };
  
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

  console.log ("Mongo DB query", query)

  return query;
};

// Main route
router.post('/ai-search', async (req, res) => {
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

    let parsedFilters = gptRes.data.choices[0].message.content.replace(/```json|```/g, '');
    parsedFilters = JSON.parse(parsedFilters);

    // 2. Save user query to DB
    await AISearchQuery.create({
      userId: req.user?._id || null,
      rawQuery: query,
      parsedFilters
    });

    // 3. Build and run MongoDB query
    const mongoQuery = buildMongoQuery(req, parsedFilters);
    const results = await Property.find(mongoQuery).limit(30).lean();

    // 4. Respond
    res.status(200).json({ results });

  } catch (err) {
    console.error('AI search error:', err.response?.data || err.message);
    res.status(500).json({ message: 'Error processing search query.' });
  }
});

module.exports = router;
