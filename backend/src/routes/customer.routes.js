import { Router } from 'express';
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customer.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { customerSchema, customerUpdateSchema } from '../validators/schemas.js';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission('customers', 'read'), listCustomers);
router.get('/:id', requirePermission('customers', 'read'), getCustomer);
router.post('/', requirePermission('customers', 'create'), validate(customerSchema), createCustomer);
router.patch('/:id', requirePermission('customers', 'update'), validate(customerUpdateSchema), updateCustomer);
router.delete('/:id', requirePermission('customers', 'delete'), deleteCustomer);

export default router;
