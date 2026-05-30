import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';

function signToken(user) {
  return jwt.sign({ sub: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user || !user.isActive) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }
  const ok = await user.comparePassword(password);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials.' });

  res.json({ token: signToken(user), user });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});
