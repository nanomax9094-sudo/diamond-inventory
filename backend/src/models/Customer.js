import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    company: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    address: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

customerSchema.index({ createdAt: -1 });
customerSchema.index({ name: 'text', company: 'text', email: 'text', phone: 'text' });

export default mongoose.model('Customer', customerSchema);
