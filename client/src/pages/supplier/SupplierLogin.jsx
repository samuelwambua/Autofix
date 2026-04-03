import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Store, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axiosInstance';
import useSupplierStore from '../../store/supplierStore';

const schema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

const SupplierLogin = () => {
  const navigate = useNavigate();
  const { loginSupplier } = useSupplierStore();
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await axiosInstance.post('/supplier/auth/login', data);
      const { supplier, token } = res.data.data;
      loginSupplier(supplier, token);
      toast.success(`Welcome back, ${supplier.business_name}!`);

      // Redirect based on status
      if (supplier.status === 'active') {
        navigate('/supplier/dashboard');
      } else {
        navigate('/supplier/status');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-950 to-amber-900
      flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500
            flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
            <Store size={28} className="text-white" />
          </div>
          <h1 className="text-white font-black text-2xl">Supplier Portal</h1>
          <p className="text-white/50 text-sm mt-1">Sign in to manage your business</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            <div>
              <label className="text-white/70 text-sm font-medium mb-1.5 block">Email Address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input type="email" placeholder="email@business.com"
                  {...register('email')}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 pl-10
                    text-white placeholder-white/30 text-sm focus:outline-none
                    focus:ring-2 focus:ring-orange-500/50 transition-all" />
              </div>
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="text-white/70 text-sm font-medium mb-1.5 block">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input type={showPass ? 'text' : 'password'} placeholder="Your password"
                  {...register('password')}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 pl-10 pr-10
                    text-white placeholder-white/30 text-sm focus:outline-none
                    focus:ring-2 focus:ring-orange-500/50 transition-all" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2
                bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold
                rounded-xl py-3 mt-2 shadow-lg shadow-orange-500/30 transition-all
                disabled:opacity-50">
              {loading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</>
                : 'Sign In'
              }
            </button>
          </form>
        </div>

        <p className="text-center text-white/30 text-sm mt-6">
          New supplier?{' '}
          <Link to="/supplier/register" className="text-orange-400 hover:text-orange-300 font-semibold">
            Register your business
          </Link>
        </p>
        <p className="text-center text-white/20 text-xs mt-2">
          <Link to="/login" className="hover:text-white/40 transition-colors">
            ← Back to AutoFix main login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SupplierLogin;