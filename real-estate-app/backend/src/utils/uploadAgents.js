require('dotenv').config(); // Load environment variables
const mongoose = require('mongoose');
const fs = require('fs');
const csvParser = require('csv-parser');

const MONGO_URI = process.env.MONGO_URI; // Load MongoDB URI from .env

if (!MONGO_URI) {
    console.error('MONGO_URI is not set in .env file.');
    process.exit(1);
}

// MongoDB Connection
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const Agent = require('../models/Agent'); // Adjust path if needed

const filePath = process.argv[2]; // Pass CSV file path as argument
if (!filePath) {
    console.error('Please provide a CSV file path.');
    process.exit(1);
}

// Function to parse and upload/update data
const importAgents = async () => {
    const agents = [];

    fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (row) => {
            const agent = {
                name: `${row['First Name']} ${row['Last Name']}`.trim(),
                email: row['Contact Email'],
                phoneNumber: row['Mobile'] || row['Phone'] || null, // Use Mobile first, else Phone
                agencyName: row['Company Name'] || '', // Add agency name if present
                region: row['City'] || '' // Add region if present
            };
            agents.push(agent);
        })
        .on('end', async () => {
            try {
                for (const agent of agents) {
                    if (agent.email) {
                        // Find agent by email and update if exists, otherwise insert
                        await Agent.findOneAndUpdate(
                            { email: agent.email }, // Search by email
                            agent, // Update agent data
                            { upsert: true, new: true, setDefaultsOnInsert: true }
                        );
                    }
                }
                console.log('Agents successfully uploaded or updated.');
                mongoose.connection.close();
            } catch (error) {
                console.error('Error inserting/updating agents:', error);
                mongoose.connection.close();
            }
        });
};

// Start the upload process
importAgents();
