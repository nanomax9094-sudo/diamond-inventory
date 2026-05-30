/**
 * Role-based access control.
 * Admins bypass all checks. Staff are gated by their per-module permissions.
 */
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  next();
}

/**
 * Require a specific permission on a module, e.g. requirePermission('diamonds', 'create').
 */
export function requirePermission(module, action) {
  return (req, res, next) => {
    if (req.user?.role === 'admin') return next();
    const allowed = req.user?.permissions?.[module]?.[action];
    if (!allowed) {
      return res
        .status(403)
        .json({ message: `You do not have permission to ${action} ${module}.` });
    }
    next();
  };
}
