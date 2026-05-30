import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useForm } from '../lib/useForm.js';
import { loginSchema } from '../lib/schemas.js';
import { Alert, FieldError, inputCls } from '../components/ui/Bits.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  const { values, errors, touched, serverError, submitting, setField, handleBlur, handleSubmit } = useForm({
    schema: loginSchema,
    initialValues: { email: 'admin@stienhardt.com', password: '' },
    onSubmit: async (v) => {
      // Trim to defend against stray whitespace from browser autofill/paste.
      await login(v.email.trim(), v.password.trim());
      navigate(location.state?.from?.pathname || '/', { replace: true });
    },
  });

  return (
    <div className="grid min-h-screen place-items-center bg-navy-900 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-2xl font-bold tracking-widest text-white">STIENHARDT</div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-gold-500">Diamond Inventory</div>
        </div>
        <form onSubmit={handleSubmit} className="card space-y-4 p-6" noValidate>
          <h1 className="text-lg font-semibold text-navy-900">Sign in</h1>
          <Alert>{serverError}</Alert>
          <div>
            <label className="label">Email</label>
            <input
              className={inputCls(touched.email && errors.email)}
              type="email"
              value={values.email}
              onChange={(e) => setField('email', e.target.value)}
              onBlur={() => handleBlur('email')}
            />
            <FieldError>{touched.email && errors.email}</FieldError>
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input
                className={`${inputCls(touched.password && errors.password)} pr-10`}
                type={showPassword ? 'text' : 'password'}
                value={values.password}
                onChange={(e) => setField('password', e.target.value)}
                onBlur={() => handleBlur('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
            <FieldError>{touched.password && errors.password}</FieldError>
          </div>
          <button className="btn-gold w-full" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Eye() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.5M6.6 6.6A13.2 13.2 0 0 0 2 11s3.5 7 10 7a9.1 9.1 0 0 0 4.4-1.1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m2 2 20 20" />
    </svg>
  );
}
