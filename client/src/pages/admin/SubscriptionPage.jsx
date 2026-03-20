import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Crown, CheckCircle, X, Clock, Shield, Zap, Star } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Spinner from '../../components/common/Spinner';

const fetchSubscription = () => axiosInstance.get('/subscription/my').then(r => r.data);

const PlanFeature = ({ included, text }) => (
  <div className="flex items-center gap-2.5 py-1.5">
    {included
      ? <CheckCircle size={15} className="text-emerald-400 flex-shrink-0" />
      : <X size={15} className="text-white/20 flex-shrink-0" />
    }
    <span className={`text-sm ${included ? 'text-white/80' : 'text-white/30'}`}>{text}</span>
  </div>
);

const fmt = (n) => (!n || n >= 999999) ? 'Unlimited' : n.toLocaleString();

const SubscriptionPage = () => {
  const [selectedPlan, setSelectedPlan] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['mySubscription'],
    queryFn: fetchSubscription,
  });

  if (isLoading) {
    return (
      <PageWrapper title="Subscription">
        <div className="flex items-center justify-center py-32">
          <Spinner size="lg" text="Loading subscription..." />
        </div>
      </PageWrapper>
    );
  }

  const sub   = data?.data || {};
  const plans = sub.plans || {};

  const currentPlan = sub.in_trial ? 'trial' : sub.plan;

  const planDetails = [
    {
      key: 'basic',
      name: 'Basic',
      price: 3000,
      icon: Shield,
      color: 'from-blue-500 to-indigo-500',
      shadow: 'shadow-blue-500/20',
      border: 'border-blue-500/30',
      features: [
        { text: 'Up to 5 staff members',     included: true },
        { text: 'Up to 50 clients',           included: true },
        { text: 'Up to 50 vehicles',          included: true },
        { text: 'Up to 30 job cards/month',   included: true },
        { text: 'Up to 30 invoices/month',    included: true },
        { text: 'Up to 100 inventory items',  included: true },
        { text: '1 supervisor',               included: true },
        { text: 'Map listing',                included: true },
        { text: 'Analytics dashboard',        included: false },
        { text: 'Unlimited everything',       included: false },
        { text: 'Priority support',           included: false },
      ],
    },
    {
      key: 'premium',
      name: 'Premium',
      price: 6500,
      icon: Crown,
      color: 'from-amber-500 to-orange-500',
      shadow: 'shadow-amber-500/20',
      border: 'border-amber-500/30',
      popular: true,
      features: [
        { text: 'Unlimited staff members',    included: true },
        { text: 'Unlimited clients',          included: true },
        { text: 'Unlimited vehicles',         included: true },
        { text: 'Unlimited job cards',        included: true },
        { text: 'Unlimited invoices',         included: true },
        { text: 'Unlimited inventory items',  included: true },
        { text: 'Unlimited supervisors',      included: true },
        { text: 'Map listing',                included: true },
        { text: 'Analytics dashboard',        included: true },
        { text: 'All features unlocked',      included: true },
        { text: 'Priority support',           included: true },
      ],
    },
  ];

  return (
    <PageWrapper title="Subscription" subtitle="Manage your garage subscription plan.">

      {/* ── Current Status Card ──────────────────────────── */}
      <GlassCard className="p-5 mb-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0
            ${sub.in_trial ? 'bg-blue-500/20' :
              sub.plan === 'premium' ? 'bg-amber-500/20' : 'bg-blue-500/20'}`}>
            {sub.in_trial ? <Clock size={22} className="text-blue-400" /> :
             sub.plan === 'premium' ? <Crown size={22} className="text-amber-400" /> :
             <Shield size={22} className="text-blue-400" />}
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-lg">
              {sub.in_trial ? 'Free Trial' :
               sub.plan === 'premium' ? 'Premium Plan' :
               sub.plan === 'basic' ? 'Basic Plan' : 'Free Trial'}
            </p>
            {sub.in_trial && (
              <p className="text-white/50 text-sm mt-0.5">
                <span className={`font-semibold ${sub.days_left <= 7 ? 'text-amber-400' : 'text-blue-400'}`}>
                  {sub.days_left} days remaining
                </span>
                {' '}— Trial expires {new Date(sub.trial_ends_at).toLocaleDateString('en-KE', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}
              </p>
            )}
            {!sub.in_trial && sub.sub_active && sub.subscription_ends_at && (
              <p className="text-white/50 text-sm mt-0.5">
                Active until {new Date(sub.subscription_ends_at).toLocaleDateString('en-KE', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}
              </p>
            )}
            {!sub.in_trial && !sub.sub_active && sub.plan !== 'premium' && (
              <p className="text-red-400 text-sm mt-0.5 font-semibold">
                ⚠️ Trial expired — subscribe to restore access
              </p>
            )}
          </div>
          {sub.in_trial && (
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl px-3 py-2 text-center flex-shrink-0">
              <p className="text-blue-300 font-bold text-2xl">{sub.days_left}</p>
              <p className="text-blue-300/60 text-xs">days left</p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* ── Plan Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {planDetails.map((plan) => {
          const Icon       = plan.icon;
          const isCurrent  = !sub.in_trial && currentPlan === plan.key && sub.sub_active;
          const isSelected = selectedPlan === plan.key;

          return (
            <div key={plan.key} className={`relative bg-white/10 backdrop-blur-md rounded-2xl
              border-2 transition-all duration-200 overflow-hidden
              ${isCurrent ? `border-2 ${plan.border} shadow-xl ${plan.shadow}` :
                isSelected ? `border-2 ${plan.border}` :
                'border-white/10 hover:border-white/30'
              }`}>

              {plan.popular && (
                <div className="absolute top-4 right-4">
                  <span className="bg-gradient-to-r from-amber-500 to-orange-500
                    text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Star size={10} fill="white" /> Most Popular
                  </span>
                </div>
              )}

              <div className="p-6">
                {/* Plan Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${plan.color}
                    flex items-center justify-center shadow-lg`}>
                    <Icon size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">{plan.name}</p>
                    <p className="text-white/50 text-xs">per month</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-5">
                  <span className="text-white font-bold text-3xl">KES {plan.price.toLocaleString()}</span>
                  <span className="text-white/40 text-sm">/month</span>
                </div>

                {/* Features */}
                <div className="space-y-0.5 mb-6 border-t border-white/10 pt-4">
                  {plan.features.map((f, i) => (
                    <PlanFeature key={i} included={f.included} text={f.text} />
                  ))}
                </div>

                {/* CTA */}
                {isCurrent ? (
                  <div className="flex items-center justify-center gap-2 py-3 rounded-xl
                    bg-white/5 border border-white/20 text-white/60 text-sm font-semibold">
                    <CheckCircle size={15} className="text-emerald-400" />
                    Current Plan
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedPlan(isSelected ? null : plan.key)}
                    className={`w-full py-3 rounded-xl text-sm font-bold transition-all
                      ${isSelected
                        ? `bg-gradient-to-r ${plan.color} text-white shadow-lg`
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                      }`}
                  >
                    {isSelected ? '✓ Selected' : `Choose ${plan.name}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Payment Instructions ─────────────────────────── */}
      {selectedPlan && (
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Zap size={20} className="text-amber-400" />
            <h3 className="text-white font-bold text-lg">
              Subscribe to {selectedPlan === 'basic' ? 'Basic' : 'Premium'} Plan
            </h3>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-4">
            <p className="text-white/70 text-sm font-semibold mb-2">How to Subscribe:</p>
            <div className="space-y-2 text-sm text-white/60">
              <p>1. Send <span className="text-white font-bold">
                KES {selectedPlan === 'basic' ? '3,000' : '6,500'}
              </span> via M-Pesa to:</p>
              <div className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-white font-bold text-lg">0700 000 000</p>
                <p className="text-white/40 text-xs mt-0.5">AutoFix Payments</p>
              </div>
              <p>2. Use your <span className="text-white font-semibold">garage email</span> as the reference</p>
              <p>3. Send the M-Pesa confirmation code to <span className="text-white font-semibold">
                support@autofix.com
              </span></p>
              <p>4. Your plan will be activated within <span className="text-white font-semibold">
                1 hour
              </span> by our team</p>
            </div>
          </div>

          <p className="text-white/30 text-xs text-center">
            Online payment integration coming soon. For now please use M-Pesa manual payment.
          </p>
        </GlassCard>
      )}

      {/* ── Subscription Plans Comparison ────────────────── */}
      <GlassCard className="p-5 mt-6">
        <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4">
          Feature Comparison
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-white/40 py-2 px-3 font-semibold">Feature</th>
                <th className="text-center text-white/40 py-2 px-3 font-semibold">Free Trial</th>
                <th className="text-center text-blue-400 py-2 px-3 font-semibold">Basic</th>
                <th className="text-center text-amber-400 py-2 px-3 font-semibold">Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[
                { feature: 'Staff members',    free: 'Unlimited', basic: '5',    premium: 'Unlimited' },
                { feature: 'Clients',          free: 'Unlimited', basic: '50',   premium: 'Unlimited' },
                { feature: 'Vehicles',         free: 'Unlimited', basic: '50',   premium: 'Unlimited' },
                { feature: 'Job cards/month',  free: 'Unlimited', basic: '30',   premium: 'Unlimited' },
                { feature: 'Invoices/month',   free: 'Unlimited', basic: '30',   premium: 'Unlimited' },
                { feature: 'Inventory items',  free: 'Unlimited', basic: '100',  premium: 'Unlimited' },
                { feature: 'Supervisors',      free: 'Unlimited', basic: '1',    premium: 'Unlimited' },
                { feature: 'Analytics',        free: '✅',         basic: '❌',    premium: '✅' },
                { feature: 'Map listing',      free: '✅',         basic: '✅',    premium: '✅' },
                { feature: 'Priority support', free: '✅',         basic: '❌',    premium: '✅' },
                { feature: 'Price/month',      free: 'Free',      basic: 'KES 3,000', premium: 'KES 6,500' },
              ].map(({ feature, free, basic, premium }) => (
                <tr key={feature} className="hover:bg-white/5 transition-colors">
                  <td className="py-2.5 px-3 text-white/70">{feature}</td>
                  <td className="py-2.5 px-3 text-center text-white/50">{free}</td>
                  <td className="py-2.5 px-3 text-center text-blue-300">{basic}</td>
                  <td className="py-2.5 px-3 text-center text-amber-300 font-medium">{premium}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

    </PageWrapper>
  );
};

export default SubscriptionPage;