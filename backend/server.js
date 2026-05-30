import 'dotenv/config';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import User from './src/models/User.js';

const PORT = process.env.PORT || 5000;

// In-memory mode starts empty every run, so seed the admin automatically.
async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@stienhardt.com').toLowerCase();
  if (await User.findOne({ email })) return;
  const admin = new User({ name: process.env.ADMIN_NAME || 'Admin', email, role: 'admin' });
  await admin.setPassword(process.env.ADMIN_PASSWORD || 'Admin@12345');
  await admin.save();
  console.log(`✓ Seeded admin: ${email} / ${process.env.ADMIN_PASSWORD || 'Admin@12345'}`);
}

async function start() {
  try {
    await connectDB();
    if (process.env.USE_MEMORY_DB === 'true') await ensureAdmin();
    app.listen(PORT, () => console.log(`✓ API listening on http://localhost:${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
