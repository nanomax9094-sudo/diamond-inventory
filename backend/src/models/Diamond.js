import mongoose from 'mongoose';

export const DIAMOND_STATUSES = [
  'Added',
  'Available',
  'On Memo',
  'On Invoice',
  'Sold',
  'On Hold',
];

const diamondSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    certificateType: { type: String, enum: ['IGI', 'GIA', 'OTHER', ''], default: '' },
    certificateNumber: { type: String, trim: true, default: '' },
    shape: { type: String, trim: true, default: '' },
    carat: { type: Number, default: 0 },
    color: { type: String, trim: true, default: '' },
    clarity: { type: String, trim: true, default: '' },
    cut: { type: String, trim: true, default: '' },
    polish: { type: String, trim: true, default: '' },
    symmetry: { type: String, trim: true, default: '' },
    measurements: { type: String, trim: true, default: '' },
    origin: { type: String, enum: ['lab-grown', 'natural'], default: 'lab-grown' },
    price: { type: Number, default: 0 },
    cost: { type: Number, default: 0 },
    imageUrl: { type: String, default: '' },
    certificateUrl: { type: String, default: '' },
    status: { type: String, enum: DIAMOND_STATUSES, default: 'Available' },
    // Snapshot of status before going On Hold, so we can restore it
    statusBeforeHold: { type: String, enum: DIAMOND_STATUSES, default: null },
    currentMemo: { type: mongoose.Schema.Types.ObjectId, ref: 'Memo', default: null },
    currentInvoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
  },
  { timestamps: true }
);

// Indexes — speed up the common filter (status), sort (createdAt), and search.
diamondSchema.index({ status: 1, createdAt: -1 });
diamondSchema.index({ createdAt: -1 });
diamondSchema.index({ sku: 'text', shape: 'text', color: 'text', certificateNumber: 'text' });

// Strip internal-only fields from every serialized response.
// `__v` is Mongoose's version key; `statusBeforeHold` is an internal hold mechanic.
diamondSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.__v;
    delete ret.statusBeforeHold;
    return ret;
  },
});

export default mongoose.model('Diamond', diamondSchema);
