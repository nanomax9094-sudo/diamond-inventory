import { Router } from 'express';
import {
  listInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  finalizeInvoice,
  deleteInvoice,
} from '../controllers/invoice.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { transactionSchema } from '../validators/schemas.js';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission('invoices', 'read'), listInvoices);
router.get('/:id', requirePermission('invoices', 'read'), getInvoice);
router.post('/', requirePermission('invoices', 'create'), validate(transactionSchema), createInvoice);
router.patch('/:id', requirePermission('invoices', 'update'), updateInvoice);
router.patch('/:id/finalize', requirePermission('invoices', 'update'), finalizeInvoice);
router.delete('/:id', requirePermission('invoices', 'delete'), deleteInvoice);

export default router;
