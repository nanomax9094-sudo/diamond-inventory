import { z } from 'zod';

// Shared primitives -------------------------------------------------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const optionalText = (max) => z.string().trim().max(max, `Must be ${max} characters or fewer.`).optional().default('');

const requiredEmail = z
  .string()
  .trim()
  .refine((v) => EMAIL_RE.test(v), 'Enter a valid email address.');

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .default('')
  .refine((v) => v === '' || EMAIL_RE.test(v), 'Enter a valid email address.');

const optionalPhone = z
  .string()
  .trim()
  .optional()
  .default('')
  .refine((v) => v === '' || /^[+]?[\d\s()-]+$/.test(v), 'Phone may only contain digits, spaces and + ( ) -.')
  .refine((v) => {
    if (v === '') return true;
    const digits = (v.match(/\d/g) || []).length;
    return digits >= 7 && digits <= 15;
  }, 'Phone number must have 7–15 digits.');

const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .regex(/[A-Za-z]/, 'Password must include at least one letter.')
  .regex(/\d/, 'Password must include at least one number.');

// Customer ----------------------------------------------------------------
export const customerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80, 'Name is too long.'),
  company: optionalText(120),
  phone: optionalPhone,
  email: optionalEmail,
  address: optionalText(200),
  notes: optionalText(1000),
});
export const customerUpdateSchema = customerSchema.partial();

// Diamond -----------------------------------------------------------------
const diamondBase = z.object({
  sku: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{2,40}$/, 'SKU must be 2–40 letters, numbers or dashes (no spaces).')
    .transform((s) => s.toUpperCase()),
  certificateType: z.enum(['', 'IGI', 'GIA', 'OTHER']).optional(),
  certificateNumber: optionalText(50),
  shape: optionalText(30),
  carat: z.coerce.number({ message: 'Carat must be a number.' }).positive('Carat must be greater than 0.').max(100, 'Carat seems too large.'),
  color: optionalText(20),
  clarity: optionalText(20),
  cut: optionalText(20),
  polish: optionalText(20),
  symmetry: optionalText(20),
  measurements: optionalText(40),
  origin: z.enum(['lab-grown', 'natural']).optional(),
  price: z.coerce.number({ message: 'Price must be a number.' }).min(0, 'Price cannot be negative.').max(10_000_000, 'Price is too large.'),
  cost: z.coerce.number({ message: 'Cost must be a number.' }).min(0, 'Cost cannot be negative.').max(10_000_000, 'Cost is too large.').optional(),
});
export const diamondCreateSchema = diamondBase;
export const diamondUpdateSchema = diamondBase.partial();

// Auth & Users ------------------------------------------------------------
export const loginSchema = z.object({
  email: requiredEmail,
  password: z.string().min(1, 'Password is required.'),
});

export const staffCreateSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80, 'Name is too long.'),
  email: requiredEmail,
  password: strongPassword,
  permissions: z.any().optional(),
  isActive: z.boolean().optional(),
});

export const staffUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80).optional(),
  email: requiredEmail.optional(),
  password: strongPassword.optional().or(z.literal('')),
  permissions: z.any().optional(),
  isActive: z.boolean().optional(),
});

// Memo / Invoice creation -------------------------------------------------
export const transactionSchema = z.object({
  customer: z.string().trim().min(1, 'Please select a customer.'),
  diamondIds: z.array(z.string()).min(1, 'Select at least one diamond.'),
  notes: optionalText(1000),
});
