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
            - isOffMarket (boolean): If "off-market" is mentioned, return true, otherwise false.
            - landSize (string): Include unit (e.g., sqm, acres)
            - propertyType (string): e.g., house, apartment, townhouse
            - yearBuilt (string)
            - features (array of strings): e.g., ["pool", "air conditioning", "solar panels"]
            - councilRate (string): Extract if mentioned, or estimate if suburb is known.
            - zoningType (string): e.g., residential, commercial

            - dueDiligence (object):
                - insurance (string)
                - floodZone (string)
                - bushfireZone (string)
                - socialHousing (string)

            - nearbySchools (array of strings): e.g., ["School A", "School B"]
            - publicTransport (array of strings): e.g., ["Train Station 1", "Bus Stop 3"]

            - agentName (string)

            - propertyLink (string): If a link is mentioned, extract it.

            - mapsLink (string): Generate a Google Maps link from the address in this format:  
            "https://www.google.com/maps/search/?api=1&query=ADDRESS"

            - tags: Return tags only from this list if mentioned:  
            ["Recently Renovated", "Needs Renovation", "Subdivision Potential", "Plans & Permits", "Granny Flat", "Dual Living", "Zoned for Development"]

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
            `;



        // Call OpenAI API
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant that extracts structured property details.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 500,
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
            const structuredData = JSON.parse(generatedText);

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
                    const isWeeklyRent = /week|pw|wk/i.test(structuredData.rental); // Looks for 'week', 'pw', 'wk'
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



module.exports = router;
