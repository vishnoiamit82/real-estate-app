// deleteAdminUser.js
const mongoose = require('mongoose');
const User = require('../models/Users'); // Ensure this path is correct
require('dotenv').config();

const deleteAdminUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        const adminEmail = process.env.ADMIN_EMAIL || 'admin@default.com';

        const result = await User.deleteOne({ email: adminEmail });

        if (result.deletedCount > 0) {
            console.log(`✅ Admin user with email ${adminEmail} deleted successfully.`);
        } else {
            console.log(`⚠️ No admin user found with email ${adminEmail}.`);
        }

        mongoose.connection.close();
    } catch (error) {
        console.error('❌ Failed to delete admin user:', error);
        mongoose.connection.close();
    }
};

deleteAdminUser();
