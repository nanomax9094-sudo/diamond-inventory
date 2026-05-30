import Customer from '../models/Customer.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { paginate } from '../utils/paginate.js';

export const listCustomers = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const filter = {};
  if (search) {
    const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { company: rx }, { email: rx }, { phone: rx }];
  }
  const result = await paginate(Customer, req.query, { filter });
  res.json(result);
});

export const getCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) return res.status(404).json({ message: 'Customer not found.' });
  res.json(customer);
});

export const createCustomer = asyncHandler(async (req, res) => {
  if (!req.body.name) return res.status(400).json({ message: 'Customer name is required.' });
  const customer = await Customer.create(req.body);
  res.status(201).json(customer);
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!customer) return res.status(404).json({ message: 'Customer not found.' });
  res.json(customer);
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findByIdAndDelete(req.params.id);
  if (!customer) return res.status(404).json({ message: 'Customer not found.' });
  res.json({ message: 'Customer deleted.' });
});
