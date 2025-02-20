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
        // OpenAI API prompt
        const prompt = `
        Extract structured property details from the following text: 
        "${description}". 
        Return a valid JSON object with these fields:

        - address (string)
        - askingPrice (string)
        - rental (string)
        - rentalYield (string, if missing, calculate from rental & price)
        - bedrooms (number)
        - bathrooms (number)
        - carSpaces (number)
        - landSize (string, include unit e.g., sqm or acres)
        - propertyType (string, e.g., house, apartment, townhouse)
        - yearBuilt (string)
        - features (array of strings, e.g., ["pool", "air conditioning", "solar panels"])
        - councilRate (string)
        - insurance (string)
        - floodZone (string)
        - bushfireZone (string)
        - zoningType (string, e.g., residential, commercial)
        - nearbySchools (array of strings, e.g., ["School A", "School B"])
        - publicTransport (array of strings, e.g., ["Train Station 1", "Bus Stop 3"])
        - marketTrends (string, e.g., "High demand area, prices increasing")
        - agentName (string)
        - propertyLink (string, ensure it starts with 'https')
        - videoAvailableDate (string, if an agent mentions "video next week", extract the date)
        - upcomingInspectionDate (string, if an inspection is scheduled, extract the date)
        - additionalDocsExpected (string, if "documents available next week", extract date)
        - propertyCondition (string, e.g., "good", "needs renovation", "brand new")
        - potentialRenovations (string, e.g., "kitchen upgrade suggested")
        - followUpTasks (array of objects, only if agent clearly states a future action)
            Each object should have:
            - task (string, e.g., "Follow up for video")
            - followUpDate (string, must be an actual date, not "next week")
            - reason (string, must be based on explicit wording, not assumptions)

        🚨 **IMPORTANT:**  
        - If no future action is clearly mentioned, **return an empty "followUpTasks": []**  
        - Do **NOT** create follow-up tasks unless the agent explicitly states a specific date or action (e.g., "We will send the documents next Friday").  
        - Ignore vague statements like "more details soon" or "let me know if you need anything."  
        `;

        // Call OpenAI API
        const response = await axiosInstance.post(
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
