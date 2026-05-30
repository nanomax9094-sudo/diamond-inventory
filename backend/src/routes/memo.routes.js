import { Router } from 'express';
import {
  listMemos,
  getMemo,
  createMemo,
  updateMemo,
  deleteMemo,
  convertToInvoice,
} from '../controllers/memo.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { transactionSchema } from '../validators/schemas.js';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission('memos', 'read'), listMemos);
router.get('/:id', requirePermission('memos', 'read'), getMemo);
router.post('/', requirePermission('memos', 'create'), validate(transactionSchema), createMemo);
router.patch('/:id', requirePermission('memos', 'update'), updateMemo);
router.delete('/:id', requirePermission('memos', 'delete'), deleteMemo);
// Converting creates an invoice, so require invoice-create too
router.post(
  '/:id/convert',
  requirePermission('memos', 'update'),
  requirePermission('invoices', 'create'),
  convertToInvoice
);

export default router;
