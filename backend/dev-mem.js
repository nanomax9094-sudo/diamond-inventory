// One-command local dev with a zero-setup in-memory MongoDB.
// Usage: npm run dev:mem   →   API on http://localhost:5000 with a seeded admin.
// Data is NOT persisted across restarts. For real/persistent data use MONGO_URI (Atlas/local).
process.env.USE_MEMORY_DB = 'true';
import('./server.js');
