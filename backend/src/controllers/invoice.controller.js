import Invoice from '../models/Invoice.js';
import { nextSeq } from '../models/Counter.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  assertSelectable,
  setOnInvoice,
  setSold,
  releaseToAvailable,
} from '../services/statusEngine.js';
import { paginate } from '../utils/paginate.js';

const populate = [{ path: 'customer' }, { path: 'items.diamond' }, { path: 'sourceMemo' }];

export const listInvoices = asyncHandler(async (req, res) => {
  const result = await paginate(Invoice, req.query, {
    select: 'invoiceNumber customer items totalAmount status createdAt',
    populate: { path: 'customer', select: 'name company' },
  });
  res.json(result);
});

export const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id).populate(populate);
  if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
  res.json(invoice);
});

export const createInvoice = asyncHandler(async (req, res) => {
  const { customer, diamondIds = [], notes = '' } = req.body;
  if (!customer) return res.status(400).json({ message: 'A customer is required.' });
  if (!diamondIds.length) return res.status(400).json({ message: 'Select at least one diamond.' });

  // Status integrity: rejects On Memo / On Invoice / Sold / On Hold diamonds
  const diamonds = await assertSelectable(diamondIds);

  const items = diamonds.map((d) => ({ diamond: d._id, price: d.price || 0 }));
  const totalAmount = items.reduce((sum, it) => sum + it.price, 0);

  const seq = await nextSeq('invoice');
  const invoice = await Invoice.create({
    invoiceNumber: `INV-${String(seq).padStart(4, '0')}`,
    customer,
    items,
    totalAmount,
    notes,
    createdBy: req.user._id,
  });

  try {
    await setOnInvoice(diamondIds, invoice._id);
  } catch (err) {
    await invoice.deleteOne();
    throw err;
  }
  res.status(201).json(await invoice.populate(populate));
});

export const updateInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
  if (invoice.status !== 'open') {
    return res.status(409).json({ message: `Cannot edit a ${invoice.status} invoice.` });
  }
  const { customer, notes } = req.body;
  if (customer) invoice.customer = customer;
  if (notes !== undefined) invoice.notes = notes;
  await invoice.save();
  res.json(await invoice.populate(populate));
});

// PATCH /:id/finalize → diamonds become Sold
export const finalizeInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
  if (invoice.status === 'finalized') {
    return res.status(409).json({ message: 'Invoice is already finalized.' });
  }
  if (invoice.status === 'cancelled') {
    return res.status(409).json({ message: 'Cannot finalize a cancelled invoice.' });
  }
  await setSold(invoice.items.map((it) => it.diamond));
  invoice.status = 'finalized';
  await invoice.save();
  res.json(await invoice.populate(populate));
});

export const deleteInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
  if (invoice.status === 'finalized') {
    return res.status(409).json({ message: 'Cannot delete a finalized (sold) invoice.' });
  }
  await releaseToAvailable(invoice.items.map((it) => it.diamond));
  await invoice.deleteOne();
  res.json({ message: 'Invoice deleted and diamonds released.' });
});
