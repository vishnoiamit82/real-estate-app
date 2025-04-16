const dotenv = require("dotenv");

console.log("✅ NODE_ENV:", process.env.NODE_ENV);

// Load environment-specific `.env` file
if (process.env.NODE_ENV === "production") {
    dotenv.config({ path: "../.env.production" });
} else if (process.env.NODE_ENV === "test") {
    dotenv.config({ path: "../.env.test" });
} else {
    dotenv.config({ path: "../.env.local" });
}

// Load environment variables
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
    const emailsInFile = new Set();

    fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (row) => {
            const email = row['Contact Email']?.trim().toLowerCase();
            if (!email) return;

            const agent = {
                name: `${row['First Name']} ${row['Last Name']}`.trim(),
                email: email,
                phoneNumber: row['Mobile'] || row['Phone'] || null,
                agencyName: row['Company Name'] || '',
                region: row['City'] || ''
            };

            agents.push(agent);
            emailsInFile.add(email);
        })
        .on('end', async () => {
            try {
                const existingAgents = await Agent.find({}, 'email');
                const existingEmails = new Set(existingAgents.map(a => a.email.toLowerCase()));

                for (const agent of agents) {
                    await Agent.findOneAndUpdate(
                        { email: agent.email },
                        agent,
                        { upsert: true, new: true, setDefaultsOnInsert: true }
                    );
                }

                const missingFromFile = [...existingEmails].filter(email => !emailsInFile.has(email));

                if (missingFromFile.length > 0) {
                    console.log("⚠️ Agents in database but not in CSV:");
                    missingFromFile.forEach(email => console.log(`- ${email}`));
                }

                console.log('✅ Agents successfully uploaded/updated.');
                mongoose.connection.close();
            } catch (error) {
                console.error('❌ Error inserting/updating agents:', error);
                mongoose.connection.close();
            }
        });
};

// Start the upload process
importAgents();
