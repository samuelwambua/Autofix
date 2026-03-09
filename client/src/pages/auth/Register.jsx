import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, User, Phone, Wrench, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { registerClientApi } from '../../api/authApi';
import useAuthStore from '../../store/authStore';

// ─── Validation Schema ────────────────────────────────────
const schema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters.'),
  last_name:  z.string().min(2, 'Last name must be at least 2 characters.'),
  email:      z.string().email('Please enter a valid email address.'),
  phone:      z.string().min(10, 'Please enter a valid phone number.'),
  password:   z.string().min(6, 'Password must be at least 6 characters.'),
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Passwords do not match.',
  path: ['confirm_password'],
});

// ─── Reusable field component ─────────────────────────────
const Field = ({ label, icon: Icon, error, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-white/70 text-sm font-medium">{label}</label>
    <div className="relative">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 z-10">
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
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

      <div className="w-full max-w-md relative z-10">

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
                placeholder="07XX XXX XXX"
                {...register('phone')}
                className={inputClass(!!errors.phone)}
              />
            </Field>

            {/* Password */}
            <Field label="Password" icon={Lock} error={errors.password?.message}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password')}
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
              disabled={loading}
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

          {/* ── Login link ────────────────────────── */}
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