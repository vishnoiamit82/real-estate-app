// Import core packages
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require("dotenv");



const app = express();

// Middleware for authentication and authorization
const { authMiddleware } = require('./middlewares/authMiddleware');
const loggerMiddleware = require('./middlewares/loggerMiddleware');
const sanitizeResponseMiddleware = require('./middlewares/sanitizeResponse');


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
const forgotPasswordRoutes = require('./routes/forgotPasswordRoutes');
const resetPasswordRoutes = require('./routes/resetPasswordRoutes');
const savedPropertyRoutes = require('./routes/savedPropertyRoutes');
const sharedPropertyRoute = require('./routes/sharedPropertyRoute');
const propertyConversationRoute = require('./routes/propertyConversationRoutes');
const authRoutes = require('./routes/auth'); // contains /refresh endpoint
const publicRoutes = require('./routes/publicRoutes');
const adminQueriesRoutes = require('./routes/adminQueriesRoutes');
const tagsRoutes = require('./routes/tagsRoutes');
const communityMessagesRoutes = require('./routes/communityMessagesRoutes');
const rateLimit = require('express-rate-limit');





// Load environment-specific `.env` file
if (process.env.NODE_ENV === "production") {
    dotenv.config({ path: ".env.production" });
} else if(process.env.NODE_ENV === "test"){
    dotenv.config({ path: ".env.test" });
}
else {
    dotenv.config({ path: ".env.local" });
}

// ✅ CORS Configuration for Local and Production Environments
const allowedOrigins = [
    'http://localhost:3000', // Local frontend
    'https://buyers-agent-ui.vercel.app', // Production frontend,
    'https://www.propsourcing.com.au'
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

app.use(sanitizeResponseMiddleware);

// ✅ Apply Authentication Middleware Globally
// app.use(authMiddleware);
app.use(loggerMiddleware); 



const publicLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 mins
    max: 100, // max 100 requests per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests. Please try again later.',
  });
  


// ✅ Database connection
mongoose
    .connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log('✅ MongoDB connected'))
    .catch((err) => console.error('❌ MongoDB connection error:', err));

// ✅ Public routes (No authentication required)
app.use('/api/login', publicLimiter,loginRoute);
app.use('/api/signup', publicLimiter, usersSignupRoutes);
app.use('/api/shared', publicLimiter, sharedPropertyRoute);
app.use('/api/public', publicLimiter, publicRoutes);
app.use('/api/forgot-password', publicLimiter,forgotPasswordRoutes);
app.use('/api/reset-password',publicLimiter, resetPasswordRoutes);
app.use('/api/auth',publicLimiter, authRoutes);
app.use('/api/cashflow', publicLimiter, cashFlowRoutes);

// ✅ Default route for health check
app.get('/', publicLimiter, (req, res) => {
    res.send('✅ API is working!');
});



// ✅ Protected routes (Require authentication)
app.use('/api/agents', authMiddleware, agentRoutes);

app.use('/api/properties', (req, res, next) => {
    const publicPaths = ['/community']; // relative to /api/properties
    if (publicPaths.includes(req.path)) {
      return next();
    }
    return authMiddleware(req, res, next);
  }, propertyRoutes);


// Protected processing
app.use('/api/process-description', authMiddleware, processDescriptionRoutes);
app.use('/api/client-briefs', authMiddleware, clientBriefRoutes);
app.use('/api/buyers-agents', authMiddleware, buyersAgentRoutes);
app.use('/api/follow-up-tasks', authMiddleware, taskRoutes);

app.use('/api/send-email', authMiddleware, sendGridRoutes);
app.use('/api/email-templates', authMiddleware, emailTemplatesRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/saved-properties', authMiddleware, savedPropertyRoutes);
app.use('/api/ai-search-queries', authMiddleware, adminQueriesRoutes);
app.use('/api/tags',authMiddleware, tagsRoutes);
app.use('/api/community-messages', authMiddleware, communityMessagesRoutes);
app.use('/api/property-conversations', authMiddleware, propertyConversationRoute);


app.use('/api/email-replies', emailRepliesRoutes);




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
