// Import core packages
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware for authentication and authorization
const { authMiddleware } = require('./middlewares/authMiddleware');
const loggerMiddleware = require('./middlewares/loggerMiddleware');


// ✅ Import routes
const agentRoutes = require('./routes/agentRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const processDescriptionRoutes = require('./routes/processDescriptionRoutes');
const clientBriefRoutes = require('./routes/clientBriefRoutes');
const buyersAgentRoutes = require('./routes/buyersAgentRoutes');
const taskRoutes = require('./routes/taskRoutes');
const cashFlowRoutes = require('./routes/cashFlowRoutes');
const sendGridRoutes = require('./routes/sendgridRoutes');
const emailTemplatesRoutes = require('./routes/emailTemplatesRoutes');
const emailRepliesRoutes = require('./routes/emailRepliesRoutes');
const usersSignupRoutes = require('./routes/UsersSignupRoutes');
const userRoutes = require('./routes/UserRoutes');
const loginRoute = require('./routes/loginRoute');

// ✅ CORS Configuration for Local and Production Environments
const allowedOrigins = [
    'http://localhost:3000', // Local frontend
    'https://real-estate-fpnomlqop-amit-vishnois-projects.vercel.app' // Production frontend
];

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};

// ✅ Apply Global Middleware
app.use(cors(corsOptions));
// app.use(bodyParser.json());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


// ✅ Apply Authentication Middleware Globally
// app.use(authMiddleware);
app.use(loggerMiddleware); 


// ✅ Database connection
mongoose
    .connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log('✅ MongoDB connected'))
    .catch((err) => console.error('❌ MongoDB connection error:', err));

// ✅ Public routes (No authentication required)
app.use('/api/login', loginRoute);
app.use('/api/signup', usersSignupRoutes);

// ✅ Protected routes (Require authentication)
app.use('/api/agents', authMiddleware, agentRoutes);
app.use('/api/properties', authMiddleware, propertyRoutes);
app.use('/api/process-description', authMiddleware, processDescriptionRoutes);
app.use('/api/client-briefs', authMiddleware, clientBriefRoutes);
app.use('/api/buyers-agents', authMiddleware, buyersAgentRoutes);
app.use('/api/follow-up-tasks', authMiddleware, taskRoutes);
app.use('/api/cashflow', authMiddleware, cashFlowRoutes);
app.use('/api/send-email', authMiddleware, sendGridRoutes);
app.use('/api/email-templates', authMiddleware, emailTemplatesRoutes);
app.use('/api/email-replies', authMiddleware, emailRepliesRoutes);
app.use('/api/users', authMiddleware, userRoutes);






// ✅ Default route for health check
app.get('/', (req, res) => {
    res.send('✅ API is working!');
});

// ✅ Handle 404 Errors for undefined routes
app.use((req, res) => {
    // console.log ("I am here")
    res.status(404).json({ message: '❌ API route not found' });
});

// ✅ Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('❌ Global Error:', err.message);
    res.status(500).json({ message: '❌ Internal Server Error' });
});

module.exports = app;
