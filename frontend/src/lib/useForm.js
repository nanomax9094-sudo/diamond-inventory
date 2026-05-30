import { useState } from 'react';
import { apiError } from '../api/client.js';

/**
 * Reusable form state + Zod validation hook used across all forms.
 *  - validates the whole form on submit
 *  - re-validates a field live once it's been touched / has an error
 *  - maps backend field errors ({ errors: { field: msg } }) onto inputs
 */
export function useForm({ schema, initialValues, onSubmit }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function collect(vals) {
    const res = schema.safeParse(vals);
    if (res.success) return {};
    const errs = {};
    for (const issue of res.error.issues) {
      const k = issue.path[0] || '_';
      if (!errs[k]) errs[k] = issue.message;
    }
    return errs;
  }

  function setField(name, value) {
    const next = { ...values, [name]: value };
    setValues(next);
    if (touched[name] || errors[name]) {
      const errs = collect(next);
      setErrors((prev) => ({ ...prev, [name]: errs[name] }));
    }
  }

  function handleBlur(name) {
    setTouched((t) => ({ ...t, [name]: true }));
    const errs = collect(values);
    setErrors((prev) => ({ ...prev, [name]: errs[name] }));
  }

  async function handleSubmit(e) {
    e?.preventDefault?.();
    const errs = collect(values);
    setErrors(errs);
    setTouched(Object.keys(values).reduce((a, k) => ((a[k] = true), a), {}));
    if (Object.values(errs).some(Boolean)) return;

    setSubmitting(true);
    setServerError('');
    try {
      await onSubmit(values);
    } catch (err) {
      const fieldErrs = err?.response?.data?.errors;
      if (fieldErrs && typeof fieldErrs === 'object') setErrors(fieldErrs);
      setServerError(apiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return { values, errors, touched, serverError, submitting, setField, setValues, handleBlur, handleSubmit };
}
