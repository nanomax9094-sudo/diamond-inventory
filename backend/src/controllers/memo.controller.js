import Memo from '../models/Memo.js';
import Invoice from '../models/Invoice.js';
import Diamond from '../models/Diamond.js';
import { nextSeq } from '../models/Counter.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  assertSelectable,
  setOnMemo,
  moveMemoToInvoice,
  releaseToAvailable,
} from '../services/statusEngine.js';
import { paginate } from '../utils/paginate.js';

const populate = [
  { path: 'customer' },
  { path: 'items.diamond' },
];

export const listMemos = asyncHandler(async (req, res) => {
  // Lean list: only the customer's name + raw items (for the count) — not full diamond docs.
  const result = await paginate(Memo, req.query, {
    select: 'memoNumber customer items totalAmount status createdAt',
    populate: { path: 'customer', select: 'name company' },
  });
  res.json(result);
});

export const getMemo = asyncHandler(async (req, res) => {
  const memo = await Memo.findById(req.params.id).populate(populate);
  if (!memo) return res.status(404).json({ message: 'Memo not found.' });
  res.json(memo);
});

export const createMemo = asyncHandler(async (req, res) => {
  const { customer, diamondIds = [], notes = '' } = req.body;
  if (!customer) return res.status(400).json({ message: 'A customer is required.' });
  if (!diamondIds.length) return res.status(400).json({ message: 'Select at least one diamond.' });

  // Validates status integrity (throws 409 if any diamond is not selectable)
  const diamonds = await assertSelectable(diamondIds);

  const items = diamonds.map((d) => ({ diamond: d._id, price: d.price || 0 }));
  const totalAmount = items.reduce((sum, it) => sum + it.price, 0);

  const seq = await nextSeq('memo');
  const memo = await Memo.create({
    memoNumber: `MEMO-${String(seq).padStart(4, '0')}`,
    customer,
    items,
    totalAmount,
    notes,
    createdBy: req.user._id,
  });

  // Atomic claim; if a concurrent request grabbed a diamond first, undo the memo.
  try {
    await setOnMemo(diamondIds, memo._id);
  } catch (err) {
    await memo.deleteOne();
    throw err;
  }
  res.status(201).json(await memo.populate(populate));
});

export const updateMemo = asyncHandler(async (req, res) => {
  const memo = await Memo.findById(req.params.id);
  if (!memo) return res.status(404).json({ message: 'Memo not found.' });
  if (memo.status !== 'active') {
    return res.status(409).json({ message: `Cannot edit a ${memo.status} memo.` });
  }

  const { customer, diamondIds, notes } = req.body;
  if (notes !== undefined) memo.notes = notes;
  if (customer) memo.customer = customer;

  // If the diamond set changed, release the old ones and re-assign the new ones.
  if (Array.isArray(diamondIds)) {
    const oldIds = memo.items.map((it) => String(it.diamond));
    await releaseToAvailable(oldIds);

    try {
      const diamonds = await assertSelectable(diamondIds);
      memo.items = diamonds.map((d) => ({ diamond: d._id, price: d.price || 0 }));
      memo.totalAmount = memo.items.reduce((s, it) => s + it.price, 0);
      await setOnMemo(diamondIds, memo._id);
    } catch (err) {
      // Restore the original diamonds back onto this memo before failing.
      await setOnMemo(oldIds, memo._id).catch(() => {});
      throw err;
    }
  }

  await memo.save();
  res.json(await memo.populate(populate));
});

export const deleteMemo = asyncHandler(async (req, res) => {
  const memo = await Memo.findById(req.params.id);
  if (!memo) return res.status(404).json({ message: 'Memo not found.' });
  if (memo.status === 'converted') {
    return res.status(409).json({ message: 'Cannot delete a memo that was converted to an invoice.' });
  }
  await releaseToAvailable(memo.items.map((it) => it.diamond));
  await memo.deleteOne();
  res.json({ message: 'Memo deleted and diamonds released.' });
});

// POST /:id/convert  → create an invoice from this memo
export const convertToInvoice = asyncHandler(async (req, res) => {
  const memo = await Memo.findById(req.params.id);
  if (!memo) return res.status(404).json({ message: 'Memo not found.' });
  if (memo.status !== 'active') {
    return res.status(409).json({ message: `This memo is already ${memo.status}.` });
  }

  const diamondIds = memo.items.map((it) => it.diamond);

  const seq = await nextSeq('invoice');
  const invoice = await Invoice.create({
    invoiceNumber: `INV-${String(seq).padStart(4, '0')}`,
    customer: memo.customer,
    items: memo.items,
    totalAmount: memo.totalAmount,
    sourceMemo: memo._id,
    createdBy: req.user._id,
  });

  // Atomically move On Memo → On Invoice; undo the invoice if the move fails.
  try {
    await moveMemoToInvoice(diamondIds, memo._id, invoice._id);
  } catch (err) {
    await invoice.deleteOne();
    throw err;
  }

  memo.status = 'converted';
  memo.convertedInvoice = invoice._id;
  await memo.save();

  res.status(201).json(await invoice.populate([{ path: 'customer' }, { path: 'items.diamond' }]));
});
