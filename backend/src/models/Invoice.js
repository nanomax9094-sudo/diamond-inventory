import mongoose from 'mongoose';

const lineItemSchema = new mongoose.Schema(
  {
    diamond: { type: mongoose.Schema.Types.ObjectId, ref: 'Diamond', required: true },
    price: { type: Number, default: 0 },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    items: { type: [lineItemSchema], default: [] },
    totalAmount: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['open', 'finalized', 'cancelled'], default: 'open' },
    sourceMemo: { type: mongoose.Schema.Types.ObjectId, ref: 'Memo', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ customer: 1 });
invoiceSchema.index({ status: 1 });

export default mongoose.model('Invoice', invoiceSchema);
