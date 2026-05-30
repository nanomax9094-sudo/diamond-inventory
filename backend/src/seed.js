import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/User.js';

/**
 * Seeds the first Admin account from env vars.
 * Safe to run multiple times — it won't duplicate the admin.
 */
async function seed() {
  await connectDB();

  const email = (process.env.ADMIN_EMAIL || 'admin@stienhardt.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Admin@12345';
  const name = process.env.ADMIN_NAME || 'Admin';

  let admin = await User.findOne({ email });
  if (admin) {
    console.log(`✓ Admin already exists: ${email}`);
  } else {
    admin = new User({ name, email, role: 'admin' });
    await admin.setPassword(password);
    await admin.save();
    console.log('✓ Admin created');
    console.log(`  email:    ${email}`);
    console.log(`  password: ${password}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
