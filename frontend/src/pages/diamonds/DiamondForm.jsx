import { useState } from 'react';
import api from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useForm } from '../../lib/useForm.js';
import { diamondSchema } from '../../lib/schemas.js';
import { Alert, FieldError, inputCls } from '../../components/ui/Bits.jsx';

const SHAPES = ['Round', 'Oval', 'Princess', 'Emerald', 'Cushion', 'Pear', 'Marquise', 'Radiant', 'Asscher', 'Heart'];

const FIELDS = [
  { name: 'sku', label: 'SKU *' },
  { name: 'certificateType', label: 'Certificate Type', type: 'select', options: ['', 'IGI', 'GIA', 'OTHER'] },
  { name: 'certificateNumber', label: 'Certificate Number' },
  { name: 'shape', label: 'Shape', type: 'select', options: ['', ...SHAPES] },
  { name: 'carat', label: 'Carat / Weight *', type: 'number' },
  { name: 'color', label: 'Color' },
  { name: 'clarity', label: 'Clarity' },
  { name: 'cut', label: 'Cut' },
  { name: 'polish', label: 'Polish' },
  { name: 'symmetry', label: 'Symmetry' },
  { name: 'measurements', label: 'Measurements' },
  { name: 'origin', label: 'Origin', type: 'select', options: ['lab-grown', 'natural'] },
  { name: 'price', label: 'Price *', type: 'number' },
  { name: 'cost', label: 'Cost', type: 'number', adminOnly: true },
];

export default function DiamondForm({ diamond, onDone }) {
  const { isAdmin } = useAuth();
  const fields = FIELDS.filter((f) => !f.adminOnly || isAdmin);

  const init = {};
  fields.forEach((f) => (init[f.name] = diamond?.[f.name] ?? (f.type === 'number' ? '' : '')));
  if (!diamond) init.origin = 'lab-grown';

  const [image, setImage] = useState(null);
  const [certificate, setCertificate] = useState(null);

  const { values, errors, touched, serverError, submitting, setField, handleBlur, handleSubmit } = useForm({
    schema: diamondSchema,
    initialValues: init,
    onSubmit: async (v) => {
      const fd = new FormData();
      Object.entries(v).forEach(([k, val]) => fd.append(k, val));
      if (image) fd.append('image', image);
      if (certificate) fd.append('certificate', certificate);
      if (diamond) await api.patch(`/diamonds/${diamond._id}`, fd);
      else await api.post('/diamonds', fd);
      onDone();
    },
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Alert>{serverError}</Alert>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.name}>
            <label className="label">{f.label}</label>
            {f.type === 'select' ? (
              <select className={inputCls(touched[f.name] && errors[f.name])} value={values[f.name]} onChange={(e) => setField(f.name, e.target.value)} onBlur={() => handleBlur(f.name)}>
                {f.options.map((o) => <option key={o} value={o}>{o === '' ? '—' : o}</option>)}
              </select>
            ) : (
              <input
                className={inputCls(touched[f.name] && errors[f.name])}
                type={f.type || 'text'}
                step={f.type === 'number' ? 'any' : undefined}
                value={values[f.name]}
                onChange={(e) => setField(f.name, e.target.value)}
                onBlur={() => handleBlur(f.name)}
              />
            )}
            <FieldError>{touched[f.name] && errors[f.name]}</FieldError>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Image (Cloudinary)</label>
          <input className="input" type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])} />
          {diamond?.imageUrl && <a href={diamond.imageUrl} target="_blank" className="mt-1 block text-xs text-blue-600">current image</a>}
        </div>
        <div>
          <label className="label">Certificate (Cloudinary)</label>
          <input className="input" type="file" accept="image/*,application/pdf" onChange={(e) => setCertificate(e.target.files[0])} />
          {diamond?.certificateUrl && <a href={diamond.certificateUrl} target="_blank" className="mt-1 block text-xs text-blue-600">current certificate</a>}
        </div>
      </div>
      <p className="text-xs text-slate-400">
        Image/certificate upload requires Cloudinary keys in the backend env. Without them the diamond saves fine, just without files.
      </p>

      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onDone}>Cancel</button>
        <button className="btn-primary" disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}
