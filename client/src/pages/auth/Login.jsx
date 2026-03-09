import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, Wrench, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { loginApi } from '../../api/authApi';
import useAuthStore from '../../store/authStore';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

// ─── Validation Schema ────────────────────────────────────
const schema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  // ─── Redirect based on role ───────────────────────────
  const redirectByRole = (role) => {
    const paths = {
      admin:        '/admin/dashboard',
      supervisor:   '/supervisor/dashboard',
      mechanic:     '/mechanic/dashboard',
      receptionist: '/receptionist/dashboard',
      client:       '/client/dashboard',
    };
    return paths[role] || '/';
  };

  // ─── Submit Handler ───────────────────────────────────
  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const response = await loginApi(data);
      login(response.data.user, response.data.token);
      toast.success(`Welcome back, ${response.data.user.first_name}!`);
      navigate(redirectByRole(response.data.user.role));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900
      flex items-center justify-center p-4 relative overflow-hidden">

      {/* ── Background decorative blobs ──────────────── */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/20 rounded-full
        blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full
        blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500/10 rounded-full
        blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">

        {/* ── Logo & Title ─────────────────────────── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center
            w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600
            rounded-2xl shadow-2xl shadow-blue-500/40 mb-4">
            <Wrench size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">AutoFix</h1>
          <p className="text-white/50 text-sm">Garage Management System</p>
        </div>

        {/* ── Glass Card ───────────────────────────── */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20
          rounded-3xl shadow-2xl p-8">

          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Welcome back</h2>
            <p className="text-white/50 text-sm mt-1">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-white/70 text-sm font-medium">Email Address</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  placeholder="you@example.com"
                  {...register('email')}
                  className={`w-full bg-white/10 border rounded-xl px-4 py-3 pl-10
                    text-white placeholder-white/30 text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-500/50
                    transition-all duration-200
                    ${errors.email ? 'border-red-400/50' : 'border-white/20'}`}
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-xs">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-white/70 text-sm font-medium">Password</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className={`w-full bg-white/10 border rounded-xl px-4 py-3 pl-10 pr-10
                    text-white placeholder-white/30 text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-500/50
                    transition-all duration-200
                    ${errors.password ? 'border-red-400/50' : 'border-white/20'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                    text-white/40 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-500
                hover:from-blue-600 hover:to-indigo-600
                text-white font-semibold rounded-xl py-3 text-sm
                shadow-lg shadow-blue-500/30
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white
                    rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* ── Register link ─────────────────────── */}
          <p className="text-center text-white/40 text-sm mt-6">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;