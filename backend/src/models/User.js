import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const MODULES = ['diamonds', 'customers', 'memos', 'invoices'];
export const ACTIONS = ['read', 'create', 'update', 'delete'];

function emptyPermissions() {
  const perms = {};
  for (const m of MODULES) {
    perms[m] = { read: false, create: false, update: false, delete: false };
  }
  return perms;
}

const permissionSchema = new mongoose.Schema(
  {
    read: { type: Boolean, default: false },
    create: { type: Boolean, default: false },
    update: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
    permissions: {
      diamonds: { type: permissionSchema, default: () => ({}) },
      customers: { type: permissionSchema, default: () => ({}) },
      memos: { type: permissionSchema, default: () => ({}) },
      invoices: { type: permissionSchema, default: () => ({}) },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
};

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

// Never leak the hash
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

userSchema.statics.emptyPermissions = emptyPermissions;

export default mongoose.model('User', userSchema);
