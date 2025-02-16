const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Import routes
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
emailRepliesRoutes


// ✅ Enable CORS for both Local and Production
const allowedOrigins = [
    "http://localhost:3000",  // Local frontend
    "https://real-estate-b3ida374t-amit-vishnois-projects.vercel.app" // Production frontend
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    methods: "GET,POST,PUT,DELETE,PATCH",
    credentials: true
};


  app.use(cors(corsOptions));

// Middleware
// app.use(cors());
app.use(bodyParser.json());

// Database connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch((err) => console.error('MongoDB connection error:', err));

// Use routes
app.use('/agents', agentRoutes);
app.use('/properties', propertyRoutes);
app.use('/process-description', processDescriptionRoutes);
app.use('/client-briefs', clientBriefRoutes);
app.use('/buyers-agents', buyersAgentRoutes);
app.use('/follow-up-tasks', taskRoutes);
app.use('/cashflow', cashFlowRoutes);
app.use('/send-email', sendGridRoutes )
app.use('/email-templates',emailTemplatesRoutes)
app.use('/email-replies',emailRepliesRoutes)



// Default route
app.get('/', (req, res) => {
    res.send('API is working!');
});



module.exports = app;
