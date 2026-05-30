import { Router } from 'express';
import {
  listDiamonds,
  diamondStats,
  getDiamond,
  createDiamond,
  updateDiamond,
  deleteDiamond,
  setHold,
  bulkUpload,
} from '../controllers/diamond.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { upload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { diamondCreateSchema, diamondUpdateSchema } from '../validators/schemas.js';

const router = Router();
router.use(requireAuth);

const imageFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'certificate', maxCount: 1 },
]);

router.get('/', requirePermission('diamonds', 'read'), listDiamonds);
router.get('/stats', requirePermission('diamonds', 'read'), diamondStats);
router.get('/:id', requirePermission('diamonds', 'read'), getDiamond);
// multer (imageFields) runs first to populate req.body from multipart, then validate.
router.post('/', requirePermission('diamonds', 'create'), imageFields, validate(diamondCreateSchema), createDiamond);
router.post('/bulk-upload', requirePermission('diamonds', 'create'), upload.single('file'), bulkUpload);
router.patch('/:id', requirePermission('diamonds', 'update'), imageFields, validate(diamondUpdateSchema), updateDiamond);
router.patch('/:id/hold', requirePermission('diamonds', 'update'), setHold);
router.delete('/:id', requirePermission('diamonds', 'delete'), deleteDiamond);

export default router;
