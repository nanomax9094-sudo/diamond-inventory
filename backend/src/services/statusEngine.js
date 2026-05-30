/**
 * Diamond status engine — the single source of truth for status transitions.
 *
 * Flow:  Added → Available → On Memo → On Invoice → Sold
 *        On Hold can be applied/removed manually (reserve outside the normal flow).
 *
 * Status integrity rule (explicitly tested by the brief):
 *   A diamond that is On Invoice or Sold must NOT be addable to a new memo/invoice.
 *   A diamond On Hold must be released before it can be transacted.
 *
 * Concurrency: the "claim" operations use a single conditional updateMany filtered on
 * the allowed source status. Because each document flips atomically, two simultaneous
 * requests can never both claim the same diamond — the loser's filter simply won't
 * match, we detect the short modifiedCount, roll back our partial claim, and fail 409.
 */
import Diamond from '../models/Diamond.js';

export class StatusError extends Error {
  constructor(message) {
    super(message);
    this.status = 409; // Conflict
  }
}

// Statuses from which a diamond may be placed on a memo or invoice
const SELECTABLE = ['Added', 'Available'];
const SELECTABLE_SET = new Set(SELECTABLE);

const uniq = (ids) => [...new Set(ids.map(String))];

/**
 * Friendly pre-check: confirm all ids exist and are free, and return the docs
 * (used for pricing + a helpful error listing the offending SKUs). The atomic
 * claim below is the authoritative guard against races.
 */
export async function assertSelectable(diamondIds) {
  const ids = uniq(diamondIds);
  const diamonds = await Diamond.find({ _id: { $in: ids } });

  if (diamonds.length !== ids.length) {
    throw new StatusError('One or more selected diamonds do not exist.');
  }
  const blocked = diamonds.filter((d) => !SELECTABLE_SET.has(d.status));
  if (blocked.length) {
    const list = blocked.map((d) => `${d.sku} (${d.status})`).join(', ');
    throw new StatusError(
      `These diamonds are not available to add: ${list}. Only "Added" or "Available" diamonds can be selected.`
    );
  }
  return diamonds;
}

/** Atomically claim Available/Added diamonds onto a memo (→ On Memo). */
export async function setOnMemo(diamondIds, memoId) {
  const ids = uniq(diamondIds);
  const res = await Diamond.updateMany(
    { _id: { $in: ids }, status: { $in: SELECTABLE } },
    { $set: { status: 'On Memo', currentMemo: memoId, currentInvoice: null } }
  );
  if (res.modifiedCount !== ids.length) {
    await Diamond.updateMany(
      { _id: { $in: ids }, currentMemo: memoId },
      { $set: { status: 'Available', currentMemo: null } }
    );
    throw new StatusError('One or more diamonds were just taken by another transaction. Please retry.');
  }
}

/** Atomically claim Available/Added diamonds onto a new invoice (→ On Invoice). */
export async function setOnInvoice(diamondIds, invoiceId) {
  const ids = uniq(diamondIds);
  const res = await Diamond.updateMany(
    { _id: { $in: ids }, status: { $in: SELECTABLE } },
    { $set: { status: 'On Invoice', currentInvoice: invoiceId, currentMemo: null } }
  );
  if (res.modifiedCount !== ids.length) {
    await Diamond.updateMany(
      { _id: { $in: ids }, currentInvoice: invoiceId },
      { $set: { status: 'Available', currentInvoice: null } }
    );
    throw new StatusError('One or more diamonds were just taken by another transaction. Please retry.');
  }
}

/** Convert: move this memo's diamonds (On Memo) → On Invoice, atomically. */
export async function moveMemoToInvoice(diamondIds, memoId, invoiceId) {
  const ids = uniq(diamondIds);
  const res = await Diamond.updateMany(
    { _id: { $in: ids }, status: 'On Memo', currentMemo: memoId },
    { $set: { status: 'On Invoice', currentInvoice: invoiceId } }
  );
  if (res.modifiedCount !== ids.length) {
    throw new StatusError('Some diamonds on this memo are no longer available to convert.');
  }
}

/** Finalize: mark diamonds as Sold. */
export async function setSold(diamondIds) {
  await Diamond.updateMany({ _id: { $in: uniq(diamondIds) } }, { $set: { status: 'Sold' } });
}

/** Release diamonds back to Available (memo/invoice deleted or items changed). */
export async function releaseToAvailable(diamondIds) {
  await Diamond.updateMany(
    { _id: { $in: uniq(diamondIds) } },
    { $set: { status: 'Available', currentMemo: null, currentInvoice: null } }
  );
}

/**
 * Toggle On Hold on a single diamond.
 *  - Cannot hold a diamond that is On Memo / On Invoice / Sold.
 *  - Releasing restores the prior status (Added/Available).
 */
export async function toggleHold(diamond, hold) {
  if (hold) {
    if (diamond.status === 'On Hold') return diamond;
    if (!SELECTABLE_SET.has(diamond.status)) {
      throw new StatusError(`Cannot hold a diamond that is "${diamond.status}".`);
    }
    diamond.statusBeforeHold = diamond.status;
    diamond.status = 'On Hold';
  } else {
    if (diamond.status !== 'On Hold') return diamond;
    diamond.status = diamond.statusBeforeHold || 'Available';
    diamond.statusBeforeHold = null;
  }
  await diamond.save();
  return diamond;
}
