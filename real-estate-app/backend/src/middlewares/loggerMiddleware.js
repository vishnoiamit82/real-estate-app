const getCurrentTimestamp = () => new Date().toISOString();

const loggerMiddleware = (req, res, next) => {
    const timestamp = getCurrentTimestamp();
    console.log(`[${timestamp}] 📌 Incoming Request:`);
    console.log(`[${timestamp}] ➡️ Method: ${req.method}`);
    console.log(`[${timestamp}] ➡️ URL: ${req.originalUrl}`);
    console.log(`[${timestamp}] ➡️ Headers:`, JSON.stringify(req.headers, null, 2));

    if (req.headers['content-type']?.includes('multipart/form-data')) {
        console.log(`[${timestamp}] ⚠ Skipping body log for multipart/form-data (parsed by multer)`);
      }
      
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
        console.log(`[${timestamp}] ➡️ Body:`, JSON.stringify(req.body, null, 2));
    } else {
        console.log(`[${timestamp}] ➡️ Body: No body in request or body not yet parsed`);
    }

    if (req.user) {
        console.log(`[${timestamp}] 🔑 Authenticated User:`, JSON.stringify(req.user, null, 2));
    } else {
        console.log(`[${timestamp}] 🚫 No authenticated user`);
    }

    next();
};


module.exports = loggerMiddleware;
