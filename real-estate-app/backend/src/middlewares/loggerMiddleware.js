const getCurrentTimestamp = () => new Date().toISOString();

const loggerMiddleware = (req, res, next) => {
    console.log(`[${getCurrentTimestamp()}] 📌 Incoming Request:`);
    console.log(`[${getCurrentTimestamp()}] ➡️ Method: ${req.method}`);
    console.log(`[${getCurrentTimestamp()}] ➡️ URL: ${req.originalUrl}`);
    console.log(`[${getCurrentTimestamp()}] ➡️ Headers:`, JSON.stringify(req.headers, null, 2));
    
    if (Object.keys(req.body).length > 0) {
        console.log(`[${getCurrentTimestamp()}] ➡️ Body:`, JSON.stringify(req.body, null, 2));
    } else {
        console.log(`[${getCurrentTimestamp()}] ➡️ Body: No body in request`);
    }

    if (req.user) {
        console.log(`[${getCurrentTimestamp()}] 🔑 Authenticated User:`, JSON.stringify(req.user, null, 2));
    } else {
        console.log(`[${getCurrentTimestamp()}] 🚫 No authenticated user`);
    }

    next();
};

module.exports = loggerMiddleware;
