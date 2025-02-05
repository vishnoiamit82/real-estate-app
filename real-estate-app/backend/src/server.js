const app = require('./app');

const PORT = process.env.NODE_ENV === "production" ? "8080" : "5001";
const HOST = process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";

app.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});