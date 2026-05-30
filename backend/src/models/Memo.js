import mongoose from 'mongoose';

const lineItemSchema = new mongoose.Schema(
  {
    diamond: { type: mongoose.Schema.Types.ObjectId, ref: 'Diamond', required: true },
    price: { type: Number, default: 0 },
  },
  { _id: false }
);

const memoSchema = new mongoose.Schema(
  {
    memoNumber: { type: String, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    items: { type: [lineItemSchema], default: [] },
    totalAmount: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['active', 'converted', 'cancelled'], default: 'active' },
    convertedInvoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

memoSchema.index({ createdAt: -1 });
memoSchema.index({ customer: 1 });
memoSchema.index({ status: 1 });

export default mongoose.model('Memo', memoSchema);
