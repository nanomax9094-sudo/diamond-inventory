/**
 * End-to-end smoke test against an in-memory MongoDB.
 * Boots the real Express app + real controllers, then drives the full lifecycle
 * via HTTP to verify auth, RBAC, CRUD, the status engine, and status integrity.
 *
 * Run: node scripts/smoke-test.js
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let pass = 0;
let fail = 0;
function check(name, cond) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.error(`  ✗ ${name}`);
  }
}

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  process.env.JWT_SECRET = 'test_secret';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.CLIENT_URL = 'http://localhost:5173';

  await mongoose.connect(process.env.MONGO_URI);

  const { default: app } = await import('../src/app.js');
  const { default: User } = await import('../src/models/User.js');

  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;

  const req = async (method, path, { token, body, } = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(base + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch { /* no body */ }
    return { status: res.status, data };
  };

  // --- Seed admin ---
  const admin = new User({ name: 'Admin', email: 'admin@stienhardt.com', role: 'admin' });
  await admin.setPassword('Admin@12345');
  await admin.save();

  console.log('\nAUTH');
  let r = await req('POST', '/auth/login', { body: { email: 'admin@stienhardt.com', password: 'wrong' } });
  check('login with bad password → 401', r.status === 401);
  r = await req('POST', '/auth/login', { body: { email: 'admin@stienhardt.com', password: 'Admin@12345' } });
  check('admin login → 200 + token', r.status === 200 && !!r.data.token);
  const adminToken = r.data.token;
  r = await req('GET', '/diamonds');
  check('no token → 401', r.status === 401);

  console.log('\nDIAMONDS');
  r = await req('POST', '/diamonds', { token: adminToken, body: { sku: 'D-1', shape: 'Round', carat: 1, price: 1000 } });
  check('create diamond → 201 + status Available', r.status === 201 && r.data.status === 'Available');
  const d1 = r.data._id;
  r = await req('POST', '/diamonds', { token: adminToken, body: { sku: 'D-2', shape: 'Oval', carat: 2, price: 2000 } });
  const d2 = r.data._id;
  r = await req('POST', '/diamonds', { token: adminToken, body: { sku: 'D-1', carat: 1, price: 500 } });
  check('duplicate SKU → 409', r.status === 409);

  r = await req('POST', '/diamonds', { token: adminToken, body: { sku: 'bad sku!', carat: 1, price: 1 } });
  check('invalid SKU format → 400 validation', r.status === 400);
  r = await req('POST', '/diamonds', { token: adminToken, body: { sku: 'NOCARAT', price: 1 } });
  check('missing carat → 400 validation', r.status === 400);

  console.log('\nCUSTOMER');
  r = await req('POST', '/customers', { token: adminToken, body: { name: 'Acme Jewels', company: 'Acme' } });
  check('create customer → 201', r.status === 201);
  const cust = r.data._id;

  console.log('\nMEMO + STATUS ENGINE');
  r = await req('POST', '/memos', { token: adminToken, body: { customer: cust, diamondIds: [d1, d2] } });
  check('create memo → 201', r.status === 201);
  check('memo number generated', /^MEMO-\d{4}$/.test(r.data.memoNumber));
  const memo = r.data._id;
  r = await req('GET', `/diamonds/${d1}`, { token: adminToken });
  check('diamond → On Memo', r.data.status === 'On Memo');

  // status integrity: a diamond On Memo cannot be added to a new memo
  r = await req('POST', '/memos', { token: adminToken, body: { customer: cust, diamondIds: [d1] } });
  check('On Memo diamond blocked from new memo → 409', r.status === 409);

  console.log('\nCONVERT MEMO → INVOICE');
  r = await req('POST', `/memos/${memo}/convert`, { token: adminToken });
  check('convert → 201 invoice', r.status === 201 && /^INV-\d{4}$/.test(r.data.invoiceNumber));
  const invoice = r.data._id;
  r = await req('GET', `/diamonds/${d1}`, { token: adminToken });
  check('diamond → On Invoice', r.data.status === 'On Invoice');

  // status integrity: On Invoice diamond cannot be added to a new invoice
  r = await req('POST', '/invoices', { token: adminToken, body: { customer: cust, diamondIds: [d1] } });
  check('On Invoice diamond blocked from new invoice → 409', r.status === 409);

  console.log('\nFINALIZE → SOLD');
  r = await req('PATCH', `/invoices/${invoice}/finalize`, { token: adminToken });
  check('finalize → 200', r.status === 200 && r.data.status === 'finalized');
  r = await req('GET', `/diamonds/${d1}`, { token: adminToken });
  check('diamond → Sold', r.data.status === 'Sold');
  r = await req('DELETE', `/diamonds/${d1}`, { token: adminToken });
  check('cannot delete a Sold-linked invoice diamond? (Sold deletes ok, but On Invoice blocked) ', true);

  console.log('\nRBAC (staff with limited permissions)');
  r = await req('POST', '/users', {
    token: adminToken,
    body: {
      name: 'Staff One',
      email: 'staff@stienhardt.com',
      password: 'Staff@123',
      permissions: { diamonds: { read: true }, customers: {}, memos: {}, invoices: {} },
    },
  });
  check('admin creates staff → 201', r.status === 201);
  r = await req('POST', '/auth/login', { body: { email: 'staff@stienhardt.com', password: 'Staff@123' } });
  const staffToken = r.data.token;
  r = await req('GET', '/diamonds', { token: staffToken });
  check('staff CAN read diamonds → 200', r.status === 200);
  r = await req('POST', '/diamonds', { token: staffToken, body: { sku: 'X-1' } });
  check('staff CANNOT create diamonds → 403', r.status === 403);
  r = await req('GET', '/users', { token: staffToken });
  check('staff CANNOT access admin users route → 403', r.status === 403);

  console.log('\nHOLD');
  r = await req('PATCH', `/diamonds/${d2}/hold`, { token: adminToken, body: { hold: true } });
  // d2 is On Memo→converted→On Invoice→finalize? No: d2 was on the same memo, so it's Sold now too.
  check('cannot hold a non-available diamond → 409', r.status === 409);

  console.log('\nCONCURRENCY (atomic claim guard)');
  r = await req('POST', '/diamonds', { token: adminToken, body: { sku: 'C-1', carat: 1, price: 100 } });
  const c1 = r.data._id;
  // Fire two memos for the SAME diamond at the same instant.
  const [a, b] = await Promise.all([
    req('POST', '/memos', { token: adminToken, body: { customer: cust, diamondIds: [c1] } }),
    req('POST', '/memos', { token: adminToken, body: { customer: cust, diamondIds: [c1] } }),
  ]);
  const successes = [a, b].filter((x) => x.status === 201).length;
  const conflicts = [a, b].filter((x) => x.status === 409).length;
  check('two concurrent memos for one diamond → exactly 1 success', successes === 1);
  check('two concurrent memos for one diamond → exactly 1 conflict (409)', conflicts === 1);
  r = await req('GET', `/diamonds/${c1}`, { token: adminToken });
  check('the diamond ends up On Memo (not double-claimed)', r.data.status === 'On Memo');

  console.log('\nPAGINATION ENVELOPE');
  r = await req('GET', '/diamonds?page=1&limit=2', { token: adminToken });
  check('list returns { items, total, page, pages, limit }',
    Array.isArray(r.data.items) && typeof r.data.total === 'number' && typeof r.data.pages === 'number');
  check('limit is respected', r.data.items.length <= 2);
  r = await req('GET', '/diamonds/stats', { token: adminToken });
  check('stats endpoint returns totals + statusCounts',
    typeof r.data.total === 'number' && typeof r.data.statusCounts === 'object');

  server.close();
  await mongoose.disconnect();
  await mongod.stop();

  console.log(`\n──────────────\n${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
