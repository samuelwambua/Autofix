import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, Shield, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axiosInstance';
import useAuthStore from '../../store/authStore';

const schema = z.object({
  email:    z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Please enter your password.'),
});

const SuperAdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [loading, setLoading]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await axiosInstance.post('/auth/login', data);
      const { user, token } = res.data.data;

      if (user.role !== 'super_admin') {
        toast.error('Access denied. Super Admin only.');
        return;
      }

      login(user, token);
      toast.success('Welcome, ' + user.first_name + '!');
      navigate('/super-admin/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-900
      flex items-center justify-center p-4 relative overflow-hidden">

      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gradient-to-br from-purple-500 to-violet-600
              p-4 rounded-2xl shadow-lg shadow-purple-500/30 mb-4">
              <Shield size={32} className="text-white" />
            </div>
            <h1 className="text-white font-bold text-2xl">Super Admin</h1>
            <p className="text-white/50 text-sm mt-1">AutoFix Platform Control</p>
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
                  placeholder="superadmin@autofix.com"
                  {...register('email')}
                  className={`w-full bg-white/10 border rounded-xl px-4 py-3 pl-10
                    text-white placeholder-white/30 text-sm focus:outline-none
                    focus:ring-2 focus:ring-purple-500/50 transition-all
                    ${errors.email ? 'border-red-400/50' : 'border-white/20'}`}
                />
              </div>
              {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
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
                  placeholder="Enter your password"
                  {...register('password')}
                  className={`w-full bg-white/10 border rounded-xl px-4 py-3 pl-10 pr-10
                    text-white placeholder-white/30 text-sm focus:outline-none
                    focus:ring-2 focus:ring-purple-500/50 transition-all
                    ${errors.password ? 'border-red-400/50' : 'border-white/20'}`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-violet-500
                hover:from-purple-600 hover:to-violet-600
                text-white font-semibold rounded-xl py-3 text-sm
                shadow-lg shadow-purple-500/30 transition-all
                disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
              {loading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</>
                : 'Sign In to Platform'
              }
            </button>
          </form>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          AutoFix Platform — Super Admin Access Only
        </p>
      </div>
    </div>
  );
};

export default SuperAdminLogin;