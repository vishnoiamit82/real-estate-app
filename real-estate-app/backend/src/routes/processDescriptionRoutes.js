const express = require('express');
const router = express.Router();
const axios = require('axios');
const Task = require('../models/Task'); // New model to store follow-up tasks

// POST /process-description - Process property description
router.post('/', async (req, res) => {
    const { description } = req.body;

    if (!description) {
        return res.status(400).json({ message: 'Description is required.' });
    }

    try {
        const prompt = `
            Extract structured property details from the following text: 
            "${description}". 
            Return a valid JSON object with these fields:

            - address (string)
            - subdivisionPotential (string): If "subdivision" or "STCA"/"subject to council approval" is mentioned, return true. Then say: If land size > 600sqm and no mention, return "Possibly". Else, "Not Sure".
            - askingPrice (string): 
                • If a price **range** is mentioned, format as "$xxx,xxx - $yyy,yyy".  
                • If it says "over $xxx,xxx", return "Over $xxx,xxx".  
                • If it's a **fixed price**, return that (e.g., "$520,000").
                
            - rental (string): Remove any text, return in format "$xxx/w" or "$xxx – $yyy/w" if a range.
            - rentalYield (string): If not directly stated, calculate using rental and asking price.
                • For yield range, use lower rent ÷ higher price for lower bound, and higher rent ÷ lower price for upper bound. Format: "x.x% – y.y%"
                • For fixed, format as "x.x%"

            - bedrooms (number)
            - bathrooms (number)
            - carSpaces (number)
            - isOffMarket (boolean): If "off market" is mentioned, return true otherwise return "Not sure"
            - landSize (string): Include unit (e.g., sqm, acres)
            - propertyType (string): Return propertyType only from this list if mentioned: [ house, apartment, townhouse, duplex ]
            - yearBuilt (string)
            - features (array of strings): e.g., ["pool", "air conditioning", "solar panels"]
            - councilRate (string): Extract if mentioned, or estimate if suburb is known.
            - zoningType (string): e.g., residential, commercial

            - dueDiligence (object):
                - insurance (string) 
                - floodZoneEnum (string) : return from the list ["Flooding", "Not flooding", "To be checked"]: If explicitly no information is provided to derive this return "To be checked"
                - floodZone (string): This is the raw description used to determine floodZoneEnum. Return the exact phrase or percentage found in the input (e.g., "Not available", "No overlay", "1 percent AEP" or any direct mention). This field is used for frontend display to show what was extracted before applying the enum logic.
                - bushfireZoneEnum (string): return from the list ["In Bush fire", "Not in Bush fire", "To be checked"]: If explicitly no information is provided to derive this return "To be checked"
                - bushfireZone (string): This is the raw description used to determine bushfireZoneEnum. Return the exact phrase or AEP found in the input (e.g., "No Overlay", "Not availabe", or any direct mention). This field is used for frontend display to show what was extracted before applying the enum logic.
                - socialHousingEnum (string): 
                    Return one of the following values: "Low", "Medium", "High", or "To be checked".
                    If no explicit data or percentage is provided, return "To be checked".
                    If the percentage of social housing is 0%, return "No social housing".
                    If less than 2%, return "Low".
                    If between 2% and 5% (inclusive), return "Medium".
                    If above 5%, return "High".

                - socialHousing (string):  This is the raw description used to determine socialHousingEnum. Return the exact phrase or percentage found in the input (e.g., "0%", "2.5% social housing", or any direct mention). This field is used for frontend display to show what was extracted before applying the enum logic.
                
            - nearbySchools (array of strings): e.g., ["School A", "School B"]
            - hasNearbySchools (string): Return from the list ["Yes", "No", "Not Sure"]
            - publicTransport (array of strings): e.g., ["Train Station 1", "Bus Stop 3"]
            - hasPublicTransport (array of strings): e.g., Return from the list ["Yes", "No", "Not Sure"]

            - agentName (string)
            - publicListing (boolean):  If offmarket return false else true. If no information provided return "Not sure"

            - propertyLink (string): If a link is mentioned, extract it.
            - offerClosingDate (string): Return all dates in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ) in local time zone depending on the property address state. 

            - mapsLink (string): Only generate if address is valid
            "https://www.google.com/maps/search/?api=1&query=ADDRESS"


            - videoAvailableDate (string): Extract concrete date if video is mentioned. If vague or missing, return null.
            - upcomingInspectionDate (string): Extract if inspection is scheduled. Return a future date or null.
            - additionalDocsExpected (string): Extract date if documents are expected.
            - propertyCondition (string): e.g., "good", "needs renovation", "brand new"
            - Renovations (string): Any notes about current or suggested renovations.
            - Future prospects (string): e.g., "subdivision potential", "plans and permits in place"

            - followUpTasks (array of objects): Only if agent clearly states a specific follow-up.
                Each object must include:
                - task (string)
                - followUpDate (string): Must be an exact date
                - reason (string): Based on explicit text

            🚨 **IMPORTANT:**  
            - If no future follow-up is clearly mentioned, return an empty "followUpTasks": []  
            - Do **NOT** include vague tasks like "will keep you posted" or "let me know if interested."
            - If any of the field data is not retreived just return null for the fields strictly unless. Do not reply with Not available, or Affordable etc.
            `;


        // - tags: Return tags only from this list if mentioned:  
        // ["Recently Renovated", "Needs Renovation", "Subdivision Potential", "Plans & Permits", "Granny Flat", "Dual Living", "Zoned for Development"]
        // Return only exact matches from list if directly stated in the description. Do not infer tags unless mentioned explicitly.


        // Call OpenAI API
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant that extracts structured property details.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 1500,
                temperature: 0.5
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Parse the response from OpenAI
        let generatedText = response.data.choices[0].message.content;
        console.log(generatedText)

        generatedText = generatedText.replace(/```json|```/g, ''); // Remove ```json markers



        try {
            let structuredData = tryParseJSON(generatedText);

            if (!structuredData) {
                // Reprompt
                const retryPrompt = `The previous response was not valid JSON. Please return the corrected, valid JSON only.`;

                const retryResponse = await axios.post(
                    'https://api.openai.com/v1/chat/completions',
                    {
                        model: 'gpt-3.5-turbo',
                        messages: [
                            { role: 'system', content: 'You are a helpful assistant that extracts structured property data.' },
                            { role: 'user', content: prompt },
                            { role: 'assistant', content: generatedText }, // original output
                            { role: 'user', content: retryPrompt }
                        ],
                        temperature: 0,
                        max_tokens: 1500
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                const retryText = retryResponse.data.choices[0].message.content.replace(/```json|```/g, '');
                structuredData = tryParseJSON(retryText);

                if (!structuredData) {
                    console.warn('🛑 Second attempt also failed. Returning raw text.');
                    return res.status(200).json({
                        structuredData: null,
                        warning: 'OpenAI returned unparseable output after retry.',
                        rawResponse: retryText
                    });
                }
            }


            // structuredData.tags = generateTagsFromStructuredData(structuredData);


            // Calculate rental yield if missing and rental is valid
            if (!structuredData.rentalYield && structuredData.askingPrice && structuredData.rental) {
                // Extract numeric values from price and rent
                const price = parseFloat(structuredData.askingPrice.replace(/[^\d.]/g, "").trim());
                const rent = parseFloat(structuredData.rental.replace(/[^\d.]/g, "").trim());

                // Check if rental is null, empty, or invalid
                if (!structuredData.rental.trim() || isNaN(rent) || rent === 0) {
                    structuredData.rentalYield = ""; // Ensure rental yield is not incorrectly set
                } else {
                    // Detect if rental is weekly or monthly
                    const isWeeklyRent = /week|w|pw|wk/i.test(structuredData.rental); // Looks for 'week', 'pw', 'wk'
                    const annualRent = isWeeklyRent ? rent * 52 : rent * 12; // Adjust for weekly rent

                    if (!isNaN(price) && price > 0) {
                        structuredData.rentalYield = ((annualRent / price) * 100).toFixed(2) + "%";
                    }
                }
            }


            // Store follow-up tasks if they exist

            // Store follow-up tasks **ONLY** if they are valid
            if (structuredData.followUpTasks && structuredData.followUpTasks.length > 0) {
                for (const task of structuredData.followUpTasks) {
                    let followUpDate = null;

                    // Only consider tasks that have a meaningful reason
                    if (task.task && task.reason && task.reason !== "Not provided") {
                        // Validate and parse followUpDate
                        if (task.followUpDate && task.followUpDate !== "Not provided") {
                            const parsedDate = new Date(task.followUpDate);
                            if (!isNaN(parsedDate.getTime())) {
                                followUpDate = parsedDate; // ✅ Only store valid dates
                            }
                        }

                        // ✅ Create task only if it's **meaningful** and has an action
                        await Task.create({
                            task: task.task,
                            followUpDate: followUpDate, // Can be null if no date provided
                            reason: task.reason,
                            propertyAddress: structuredData.address,
                        });
                    }
                }
            }



            return res.status(200).json({ structuredData });
        } catch (error) {
            console.error('Error parsing JSON:', error);
            return res.status(500).json({
                message: 'Failed to parse JSON from OpenAI response.',
                rawResponse: generatedText,
            });
        }
    } catch (error) {
        console.error('Error processing description:', error.response?.data || error.message);
        return res.status(500).json({ message: 'Error processing description.' });
    }
});


function tryParseJSON(raw) {
    try {
        const jsonStart = raw.indexOf('{');
        const jsonEnd = raw.lastIndexOf('}');
        if (jsonStart === -1 || jsonEnd === -1) return null;

        const clean = raw.slice(jsonStart, jsonEnd + 1);
        return JSON.parse(clean);
    } catch (e) {
        return null;
    }
}


function generateTagsFromStructuredData(data) {
    const tags = [];

    // 1. Price-based
    if (data.askingPriceMin && data.askingPriceMin < 500000) tags.push("under_500k");
    if (data.askingPriceMin && data.askingPriceMin >= 1000000) tags.push("1mil_plus");

    // 2. Yield-based
    if (data.rentalYieldPercent && data.rentalYieldPercent >= 6) tags.push("yield_over_6");

    // 3. Land size
    if (data.landSizeNumeric && data.landSizeNumeric >= 600) tags.push("land_over_600sqm");

    // 4. Features
    if (data.features?.includes("duplex")) tags.push("dual_occupancy");
    if (data.features?.includes("pool")) tags.push("pool");

    // 5. Subdivision
    if (data.subdivisionPotential?.toLowerCase() === "yes" || data.tags?.includes("Subdivision Potential")) {
        tags.push("subdivision_potential");
    }

    // 6. Location based
    if (data.address?.toLowerCase().includes("logan")) tags.push("logan");

    // 7. Due diligence
    if (data.dueDiligence?.floodZoneEnum === "Not flooding") tags.push("no_flood_zone");
    if (data.dueDiligence?.bushfireZoneEnum === "Not in Bush fire") tags.push("no_bushfire");

    // 8. School / Transport
    if (data.hasNearbySchools === "Yes") tags.push("near_school");
    if (data.hasPublicTransport === "Yes") tags.push("near_public_transport");

    return tags;
}

function buildRegexFilter(field, values) {
    if (!Array.isArray(values)) {
        return { [field]: { $regex: values, $options: 'i' } };
    }

    return {
        $or: values.map(v => ({
            [field]: { $regex: v, $options: 'i' }
        }))
    };
}




module.exports = router;
