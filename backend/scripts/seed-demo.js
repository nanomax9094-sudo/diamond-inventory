/**
 * Demo data seeder — populates a realistic, presentable dataset.
 *
 *   npm run seed:demo
 *
 * Wipes diamonds/customers/memos/invoices/counters (NOT users), then creates:
 *   - an admin + a limited-permission staff account
 *   - ~24 diamonds across every status (via the real status engine, so links are consistent)
 *   - 6 customers
 *   - an active memo, a memo converted to an invoice, a finalized (sold) invoice, and held stones
 *
 * Safe to re-run — it resets the demo collections each time.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import Diamond from '../src/models/Diamond.js';
import Customer from '../src/models/Customer.js';
import Memo from '../src/models/Memo.js';
import Invoice from '../src/models/Invoice.js';
import Counter from '../src/models/Counter.js';
import { nextSeq } from '../src/models/Counter.js';
import {
  setOnMemo,
  moveMemoToInvoice,
  setOnInvoice,
  setSold,
  toggleHold,
} from '../src/services/statusEngine.js';

const SHAPES = ['Round', 'Oval', 'Princess', 'Emerald', 'Cushion', 'Pear', 'Marquise', 'Radiant'];
const COLORS = ['D', 'E', 'F', 'G', 'H'];
const CLARITIES = ['IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1'];
const GRADES = ['Excellent', 'Very Good', 'Good'];

function diamondSpec(i) {
  const shape = SHAPES[i % SHAPES.length];
  const carat = +(0.5 + (i % 20) * 0.12).toFixed(2);
  const color = COLORS[i % COLORS.length];
  const clarity = CLARITIES[i % CLARITIES.length];
  const price = Math.round((1500 + carat * 4200 + (CLARITIES.length - (i % CLARITIES.length)) * 300) / 10) * 10;
  return {
    sku: `SH-${1001 + i}`,
    certificateType: i % 3 === 0 ? 'GIA' : 'IGI',
    certificateNumber: `${i % 3 === 0 ? 'GIA' : 'IGI'}${100000 + i * 137}`,
    shape,
    carat,
    color,
    clarity,
    cut: GRADES[i % GRADES.length],
    polish: GRADES[i % GRADES.length],
    symmetry: GRADES[(i + 1) % GRADES.length],
    measurements: `${(4 + carat).toFixed(1)}x${(4 + carat).toFixed(1)}x${(2.5 + carat * 0.6).toFixed(1)}`,
    origin: 'lab-grown',
    price,
    cost: Math.round(price * 0.72),
    status: 'Available',
  };
}

const CUSTOMERS = [
  { name: 'Aarav Mehta', company: 'Mehta Diamonds', phone: '+91 98250 11111', email: 'aarav@mehtadiamonds.com', address: 'Mahidharpura, Surat, Gujarat', notes: 'Wholesale, prefers round brilliants.' },
  { name: 'Sophia Klein', company: 'Klein Jewelers NYC', phone: '+1 212 555 0142', email: 'sophia@kleinjewelers.com', address: '47th St, Diamond District, New York', notes: 'High-end retail, fancy shapes.' },
  { name: 'Rajesh Patel', company: 'Patel Gems', phone: '+91 99090 22222', email: 'rajesh@patelgems.com', address: 'Varachha, Surat', notes: 'Bulk memo buyer.' },
  { name: 'Emily Carter', company: 'Carter Bridal', phone: '+1 312 555 0190', email: 'emily@carterbridal.com', address: 'Chicago, IL', notes: 'Bridal sets, VVS preferred.' },
  { name: 'Daniel Roy', company: 'Roy & Sons', phone: '+1 213 555 0177', email: 'daniel@royandsons.com', address: 'Los Angeles, CA', notes: 'Investment-grade stones.' },
  { name: 'Priya Shah', company: 'Shah Exports', phone: '+91 97370 33333', email: 'priya@shahexports.com', address: 'Katargam, Surat', notes: 'Export, certificates required.' },
];

async function ensureUser({ name, email, role, password, permissions }) {
  let u = await User.findOne({ email: email.toLowerCase() });
  if (!u) u = new User({ name, email, role });
  u.name = name;
  u.role = role;
  if (permissions) u.permissions = permissions;
  await u.setPassword(password);
  await u.save();
  return u;
}

async function run() {
  await connectDB();
  console.log('Resetting demo collections…');
  await Promise.all([
    Diamond.deleteMany({}),
    Customer.deleteMany({}),
    Memo.deleteMany({}),
    Invoice.deleteMany({}),
    Counter.deleteMany({}),
  ]);

  // Accounts
  const admin = await ensureUser({
    name: process.env.ADMIN_NAME || 'Admin',
    email: process.env.ADMIN_EMAIL || 'admin@stienhardt.com',
    role: 'admin',
    password: process.env.ADMIN_PASSWORD || 'Admin@12345',
  });
  await ensureUser({
    name: 'Sales Staff',
    email: 'staff@stienhardt.com',
    role: 'staff',
    password: 'Staff@12345',
    permissions: {
      diamonds: { read: true, create: true, update: true, delete: false },
      customers: { read: true, create: true, update: true, delete: false },
      memos: { read: true, create: true, update: true, delete: false },
      invoices: { read: true, create: false, update: false, delete: false },
    },
  });

  // Customers
  const customers = await Customer.insertMany(CUSTOMERS);
  console.log(`✓ ${customers.length} customers`);

  // Diamonds (all Available to start)
  const specs = Array.from({ length: 24 }, (_, i) => diamondSpec(i));
  const diamonds = await Diamond.insertMany(specs);
  console.log(`✓ ${diamonds.length} diamonds`);
  const ids = diamonds.map((d) => d._id);

  // --- Memo #1: active (On Memo) ---
  const memo1Ids = ids.slice(0, 3);
  const memo1 = await Memo.create({
    memoNumber: `MEMO-${String(await nextSeq('memo')).padStart(4, '0')}`,
    customer: customers[0]._id,
    items: diamonds.slice(0, 3).map((d) => ({ diamond: d._id, price: d.price })),
    totalAmount: diamonds.slice(0, 3).reduce((s, d) => s + d.price, 0),
    notes: 'On consignment for review.',
    createdBy: admin._id,
  });
  await setOnMemo(memo1Ids, memo1._id);

  // --- Memo #2 → converted to Invoice (On Invoice) ---
  const memo2Ids = ids.slice(3, 6);
  const memo2 = await Memo.create({
    memoNumber: `MEMO-${String(await nextSeq('memo')).padStart(4, '0')}`,
    customer: customers[1]._id,
    items: diamonds.slice(3, 6).map((d) => ({ diamond: d._id, price: d.price })),
    totalAmount: diamonds.slice(3, 6).reduce((s, d) => s + d.price, 0),
    createdBy: admin._id,
  });
  await setOnMemo(memo2Ids, memo2._id);
  const inv1 = await Invoice.create({
    invoiceNumber: `INV-${String(await nextSeq('invoice')).padStart(4, '0')}`,
    customer: memo2.customer,
    items: memo2.items,
    totalAmount: memo2.totalAmount,
    sourceMemo: memo2._id,
    createdBy: admin._id,
  });
  await moveMemoToInvoice(memo2Ids, memo2._id, inv1._id);
  memo2.status = 'converted';
  memo2.convertedInvoice = inv1._id;
  await memo2.save();

  // --- Direct Invoice → finalized (Sold) ---
  const soldIds = ids.slice(6, 9);
  const inv2 = await Invoice.create({
    invoiceNumber: `INV-${String(await nextSeq('invoice')).padStart(4, '0')}`,
    customer: customers[4]._id,
    items: diamonds.slice(6, 9).map((d) => ({ diamond: d._id, price: d.price })),
    totalAmount: diamonds.slice(6, 9).reduce((s, d) => s + d.price, 0),
    notes: 'Paid in full.',
    createdBy: admin._id,
  });
  await setOnInvoice(soldIds, inv2._id);
  await setSold(soldIds);
  inv2.status = 'finalized';
  await inv2.save();

  // --- On Hold (2 stones) ---
  for (const d of await Diamond.find({ _id: { $in: ids.slice(9, 11) } })) {
    await toggleHold(d, true);
  }

  // Report
  const byStatus = await Diamond.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]);
  console.log('✓ 2 memos (1 active, 1 converted), 2 invoices (1 open→converted source, 1 sold)');
  console.log('✓ status spread:', byStatus.map((s) => `${s._id}:${s.n}`).join('  '));
  console.log('\nLogins:');
  console.log('  Admin → admin@stienhardt.com / Admin@12345');
  console.log('  Staff → staff@stienhardt.com / Staff@12345 (no delete; no invoice access)');

  await mongoose.disconnect();
  console.log('\n✓ Demo data ready.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Demo seed failed:', err);
  process.exit(1);
});
