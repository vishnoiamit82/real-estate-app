const app = require('./app');
// server.js
const User = require('./models/Users');
const bcrypt = require("bcryptjs");
const { ROLE_PERMISSIONS } = require('./config/permissions');
// require('dotenv').config();

const dotenv = require("dotenv");


console.log("✅ NODE_ENV:", process.env.NODE_ENV);


// Load environment-specific `.env` file
if (process.env.NODE_ENV === "production") {
    dotenv.config({ path: ".env.production" });
} else {
    dotenv.config({ path: ".env.local" });
}


console.log("✅ FRONTEND_URL:", process.env.FRONTEND_URL);
console.log("✅ ADMIN_EMAIL:", process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL : "❌ NOT LOADED");
console.log("✅ ADMIN_PASSWORD:", process.env.ADMIN_PASSWORD ? "Loaded" : "❌ NOT LOADED");
console.log("✅ FRONTEND_URL:", process.env.FRONTEND_URL);
console.log("✅ MONGO_URI:", process.env.MONGO_URI ? "Loaded" : "❌ Not Loaded");




const PORT = process.env.NODE_ENV === "production" ? "8080" : "5001";
const HOST = process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";

app.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});



const seedAdminUser = async () => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;

        // Check if an existing admin user exists
        const existingAdmin = await User.findOne({ role: 'admin' });
        if (existingAdmin) {
            console.log('🗑️ Existing admin user found. Deleting...');
            await User.deleteOne({ _id: existingAdmin._id });
            console.log('✅ Existing admin user deleted.');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // Fetch admin permissions dynamically from ROLE_PERMISSIONS
        const adminPermissions = ROLE_PERMISSIONS.admin || [];

        // Create a new admin user
        const adminUser = new User({
            name: 'Initial Admin',
            email: adminEmail,
            password: hashedPassword,
            phoneNumber: '000-000-0000',
            role: 'admin',
            subscriptionTier: 'premium',
            permissions: adminPermissions,
            isApproved: true
        });

        await adminUser.save();
        console.log(`✅ New admin user created with email: ${adminEmail}`);
    } catch (error) {
        console.error('❌ Failed to recreate admin user:', error);
    }
};


// Call the seeding function when the server starts
seedAdminUser();
