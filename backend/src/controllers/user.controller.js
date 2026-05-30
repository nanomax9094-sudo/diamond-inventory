import User, { MODULES } from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { paginate } from '../utils/paginate.js';

// All routes here are Admin-only (enforced at the router level).

export const listUsers = asyncHandler(async (req, res) => {
  // passwordHash is excluded; lean is off so the schema's toJSON still applies elsewhere.
  const result = await paginate(User, req.query, { select: '-passwordHash', lean: true });
  res.json(result);
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  res.json(user);
});

export const createStaff = asyncHandler(async (req, res) => {
  const { name, email, password, permissions } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required.' });
  }
  const user = new User({ name, email, role: 'staff', permissions: sanitizePerms(permissions) });
  await user.setPassword(password);
  await user.save();
  res.status(201).json(user);
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });

  const { name, email, password, permissions, isActive } = req.body;
  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (isActive !== undefined) user.isActive = isActive;
  if (permissions !== undefined && user.role === 'staff') {
    user.permissions = sanitizePerms(permissions);
  }
  if (password) await user.setPassword(password);

  await user.save();
  res.json(user);
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  if (user.role === 'admin') {
    return res.status(400).json({ message: 'Cannot delete an admin account.' });
  }
  await user.deleteOne();
  res.json({ message: 'Staff account deleted.' });
});

// Only keep known modules/actions; coerce to booleans.
function sanitizePerms(perms = {}) {
  const clean = {};
  for (const m of MODULES) {
    const p = perms[m] || {};
    clean[m] = {
      read: !!p.read,
      create: !!p.create,
      update: !!p.update,
      delete: !!p.delete,
    };
  }
  return clean;
}
