import { Router } from 'express';
import {
  listUsers,
  getUser,
  createStaff,
  updateUser,
  deleteUser,
} from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { staffCreateSchema, staffUpdateSchema } from '../validators/schemas.js';

const router = Router();

// Staff management is Admin-only
router.use(requireAuth, requireAdmin);

router.get('/', listUsers);
router.post('/', validate(staffCreateSchema), createStaff);
router.get('/:id', getUser);
router.patch('/:id', validate(staffUpdateSchema), updateUser);
router.delete('/:id', deleteUser);

export default router;
