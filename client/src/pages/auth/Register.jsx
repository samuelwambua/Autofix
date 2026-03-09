import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, User, Phone, Wrench, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { registerClientApi } from '../../api/authApi';
import useAuthStore from '../../store/authStore';

// ─── Password strength checker ────────────────────────────
const getPasswordStrength = (password) => {
  if (!password) return null;
  let score = 0;
  const checks = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number:    /[0-9]/.test(password),
    special:   /[^A-Za-z0-9]/.test(password),
  };
  score = Object.values(checks).filter(Boolean).length;
  if (score <= 2) return { label: 'Weak',   color: 'bg-red-500',    text: 'text-red-400',    width: 'w-1/4', score };
  if (score === 3) return { label: 'Fair',   color: 'bg-amber-500',  text: 'text-amber-400',  width: 'w-2/4', score };
  if (score === 4) return { label: 'Medium', color: 'bg-yellow-400', text: 'text-yellow-400', width: 'w-3/4', score };
  return             { label: 'Strong',  color: 'bg-emerald-500', text: 'text-emerald-400', width: 'w-full', score };
};

// ─── Validation Schema ────────────────────────────────────
const schema = z.object({
  first_name: z
    .string()
    .min(2, 'First name must be at least 2 characters.')
    .max(50, 'First name must not exceed 50 characters.')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens and apostrophes.'),

  last_name: z
    .string()
    .min(2, 'Last name must be at least 2 characters.')
    .max(50, 'Last name must not exceed 50 characters.')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens and apostrophes.'),

  email: z
    .string()
    .min(1, 'Email address is required.')
    .email('Please enter a valid email address.')
    .max(100, 'Email must not exceed 100 characters.'),

  phone: z
    .string()
    .min(1, 'Phone number is required.')
    .regex(
      /^(\+254|0)[17]\d{8}$/,
      'Please enter a valid Kenyan phone number (e.g. 0712345678 or +254712345678).'
    ),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
    .regex(/[0-9]/, 'Password must contain at least one number.')
    .refine(
      (val) => getPasswordStrength(val)?.score >= 3,
      'Password is too weak. Use a mix of uppercase, lowercase, numbers and symbols.'
    ),

  confirm_password: z.string().min(1, 'Please confirm your password.'),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Passwords do not match.',
  path: ['confirm_password'],
});

// ─── Password requirement row ─────────────────────────────
const Requirement = ({ met, label }) => (
  <div className="flex items-center gap-1.5">
    {met
      ? <CheckCircle size={12} className="text-emerald-400 flex-shrink-0" />
      : <XCircle    size={12} className="text-white/30 flex-shrink-0" />
    }
    <span className={`text-xs ${met ? 'text-emerald-400' : 'text-white/30'}`}>{label}</span>
  </div>
);

// ─── Field wrapper ────────────────────────────────────────
const Field = ({ label, icon: Icon, error, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-white/70 text-sm font-medium">{label}</label>
    <div className="relative">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 z-10 pointer-events-none">
          <Icon size={16} />
        </div>
      )}
      {children}
    </div>
    {error && <p className="text-red-400 text-xs">{error}</p>}
  </div>
);

const inputClass = (hasError, hasIcon = true) =>
  `w-full bg-white/10 border rounded-xl px-4 py-3 text-white
   placeholder-white/30 text-sm
   focus:outline-none focus:ring-2 focus:ring-blue-500/50
   transition-all duration-200
   ${hasIcon ? 'pl-10' : ''}
   ${hasError ? 'border-red-400/50' : 'border-white/20'}`;

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [loading, setLoading]         = useState(false);
  const [showPassword, setShowPassword]   = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [passwordValue, setPasswordValue] = useState('');

  const strength = getPasswordStrength(passwordValue);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const { confirm_password: _confirm, ...payload } = data;
      const response = await registerClientApi(payload);
      login(response.data.user, response.data.token);
      toast.success(`Welcome to AutoFix, ${response.data.user.first_name}!`);
      navigate('/client/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900
      flex items-center justify-center p-4 relative overflow-hidden">

      {/* ── Background blobs ──────────────────────── */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full
        blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/20 rounded-full
        blur-3xl -translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="w-full max-w-md relative z-10 py-8">

        {/* ── Logo ─────────────────────────────────── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center
            w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600
            rounded-2xl shadow-2xl shadow-blue-500/40 mb-4">
            <Wrench size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">AutoFix</h1>
          <p className="text-white/50 text-sm">Create your client account</p>
        </div>

        {/* ── Glass Card ───────────────────────────── */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20
          rounded-3xl shadow-2xl p-8">

          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Create Account</h2>
            <p className="text-white/50 text-sm mt-1">Fill in your details to get started</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name" icon={User} error={errors.first_name?.message}>
                <input
                  type="text"
                  placeholder="John"
                  {...register('first_name')}
                  className={inputClass(!!errors.first_name)}
                />
              </Field>
              <Field label="Last Name" error={errors.last_name?.message}>
                <input
                  type="text"
                  placeholder="Doe"
                  {...register('last_name')}
                  className={inputClass(!!errors.last_name, false)}
                />
              </Field>
            </div>

            {/* Email */}
            <Field label="Email Address" icon={Mail} error={errors.email?.message}>
              <input
                type="email"
                placeholder="you@example.com"
                {...register('email')}
                className={inputClass(!!errors.email)}
              />
            </Field>

            {/* Phone */}
            <Field label="Phone Number" icon={Phone} error={errors.phone?.message}>
              <input
                type="tel"
                placeholder="0712 345 678"
                {...register('phone')}
                className={inputClass(!!errors.phone)}
              />
              <p className="text-white/30 text-xs mt-1">Format: 0712345678 or +254712345678</p>
            </Field>

            {/* Password */}
            <Field label="Password" icon={Lock} error={errors.password?.message}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password', {
                  onChange: (e) => setPasswordValue(e.target.value),
                })}
                className={`${inputClass(!!errors.password)} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2
                  text-white/40 hover:text-white/70 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>

              {/* Password strength bar */}
              {passwordValue && strength && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">Password strength</span>
                    <span className={`text-xs font-semibold ${strength.text}`}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                  </div>
                  {/* Requirements checklist */}
                  <div className="grid grid-cols-2 gap-1 pt-1">
                    <Requirement met={passwordValue.length >= 8}          label="At least 8 characters" />
                    <Requirement met={/[A-Z]/.test(passwordValue)}        label="One uppercase letter" />
                    <Requirement met={/[a-z]/.test(passwordValue)}        label="One lowercase letter" />
                    <Requirement met={/[0-9]/.test(passwordValue)}        label="One number" />
                    <Requirement met={/[^A-Za-z0-9]/.test(passwordValue)} label="One special character" />
                  </div>
                </div>
              )}
            </Field>

            {/* Confirm Password */}
            <Field label="Confirm Password" icon={Lock} error={errors.confirm_password?.message}>
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('confirm_password')}
                className={`${inputClass(!!errors.confirm_password)} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2
                  text-white/40 hover:text-white/70 transition-colors"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </Field>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || (strength && strength.score < 3)}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-500
                hover:from-blue-600 hover:to-indigo-600
                text-white font-semibold rounded-xl py-3 text-sm
                shadow-lg shadow-blue-500/30 mt-2
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white
                    rounded-full animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="text-center text-white/40 text-sm mt-6">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;