export function notFound(_req, res) {
  res.status(404).json({ message: 'Route not found' });
}

// Centralized error handler. Controllers can `throw` and we format here.
export function errorHandler(err, _req, res, _next) {
  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ message: `Duplicate value for ${field}: ${err.keyValue?.[field]}` });
  }
  // Mongoose validation
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid ${err.path}: ${err.value}` });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ message: err.message || 'Server error' });
}

/** Wrap async controllers so thrown errors reach errorHandler. */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
