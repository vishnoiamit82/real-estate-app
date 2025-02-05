const app = require('./app');

const PORT = process.env.PORT || 8080; // ✅ Use Fly.io PORT or fallback to 8080

app.listen(PORT, "0.0.0.0", () => { // ✅ Ensure it listens on 0.0.0.0
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});