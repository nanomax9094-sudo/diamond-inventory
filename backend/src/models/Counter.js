import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. 'memo', 'invoice'
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

/** Atomically increment and return the next sequence number for a key. */
export async function nextSeq(key) {
  const doc = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
}

export default Counter;
