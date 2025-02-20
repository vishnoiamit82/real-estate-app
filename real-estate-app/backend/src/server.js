const app = require('./app');
// server.js
const User = require('./models/Users');
const bcrypt = require('bcrypt');
require('dotenv').config();

const PORT = process.env.NODE_ENV === "production" ? "8080" : "5001";
const HOST = process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";

app.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});



const seedAdminUser = async () => {
    try {
        const existingAdmin = await User.findOne({ role: 'admin' });
        if (existingAdmin) {
            console.log('✅ Admin user already exists.');
            return;
        }

        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD ;

        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        const adminUser = new User({
            name: 'Initial Admin',
            email: adminEmail,
            password: hashedPassword,
            phoneNumber: '000-000-0000',
            role: 'admin',
            subscriptionTier: 'premium',
            permissions: ['manage_users', 'view_property', 'share_property', 'access_contacts']
        });

        await adminUser.save();
        console.log(`✅ Initial admin user created with email: ${adminEmail}`);
    } catch (error) {
        console.error('❌ Failed to create initial admin user:', error);
    }
};

// Call the seeding function when the server starts
seedAdminUser();
