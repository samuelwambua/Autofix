import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Crown, Star, Gift, Users, TrendingUp,
  Copy, CheckCircle, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axiosInstance';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';

const fetchLoyalty = () => axiosInstance.get('/loyalty/my').then(r => r.data);

const TIER_CONFIG = {
  Bronze: { color: 'from-orange-700 to-orange-500', icon: '🥉', min: 0,    max: 999 },
  Silver: { color: 'from-slate-400 to-slate-300',   icon: '🥈', min: 1000, max: 4999 },
  Gold:   { color: 'from-amber-500 to-yellow-400',  icon: '🥇', min: 5000, max: Infinity },
};

const TRANSACTION_ICONS = {
  earned:   { icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  redeemed: { icon: Zap,        color: 'text-blue-400',    bg: 'bg-blue-500/20' },
  bonus:    { icon: Gift,       color: 'text-purple-400',  bg: 'bg-purple-500/20' },
  referral: { icon: Users,      color: 'text-amber-400',   bg: 'bg-amber-500/20' },
};

const LoyaltyPage = () => {
  const queryClient = useQueryClient();
  const [showRedeem, setShowRedeem]     = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied]             = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['myLoyalty'], queryFn: fetchLoyalty });

  const redeemMutation = useMutation({
    mutationFn: (data) => axiosInstance.post('/loyalty/redeem', data).then(r => r.data),
    onSuccess: (d) => {
      toast.success(d.message);
      queryClient.invalidateQueries(['myLoyalty']);
      setShowRedeem(false); setRedeemPoints('');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed.'),
  });

  const referralMutation = useMutation({
    mutationFn: (data) => axiosInstance.post('/loyalty/referral', data).then(r => r.data),
    onSuccess: (d) => {
      toast.success(d.message);
      queryClient.invalidateQueries(['myLoyalty']);
      setShowReferral(false); setReferralCode('');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed.'),
  });

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Referral code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) return (
    <PageWrapper title="Loyalty & Rewards">
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" text="Loading rewards..." />
      </div>
    </PageWrapper>
  );

  const loyalty = data?.data || {};
  const tier    = TIER_CONFIG[loyalty.tiers?.current || 'Bronze'];
  const points  = loyalty.current_points || 0;
  const nextTier = loyalty.tiers?.next;

  // Progress to next tier
  const tierMin   = tier.min;
  const tierMax   = nextTier ? tierMin + (nextTier.points_needed + (points - tierMin)) : 5000;
  const progress  = nextTier ? ((points - tierMin) / (tierMax - tierMin)) * 100 : 100;

  return (
    <PageWrapper title="Loyalty & Rewards" subtitle="Earn points on every service and redeem for discounts.">

      {/* ── Tier Card ─────────────────────────────────── */}
      <div className={`bg-gradient-to-br ${tier.color} rounded-2xl p-6 mb-6 shadow-xl`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-white/70 text-sm font-medium">Your Tier</p>
            <h2 className="text-white font-black text-3xl mt-0.5">
              {tier.icon} {loyalty.tiers?.current} Member
            </h2>
          </div>
          <div className="text-right">
            <p className="text-white/70 text-sm">Available Points</p>
            <p className="text-white font-black text-3xl">{points.toLocaleString()}</p>
            <p className="text-white/60 text-xs">≈ KES {loyalty.kes_value?.toLocaleString()}</p>
          </div>
        </div>

        {/* Progress bar */}
        {nextTier && (
          <div>
            <div className="flex justify-between text-xs text-white/70 mb-1.5">
              <span>{points.toLocaleString()} pts</span>
              <span>{nextTier.points_needed.toLocaleString()} pts to {nextTier.name}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden">
              <div className="bg-white h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
          </div>
        )}

        {!nextTier && (
          <p className="text-white/80 text-sm">🎉 You've reached the highest tier!</p>
        )}
      </div>

      {/* ── Stats ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Earned',    value: loyalty.total_earned?.toLocaleString() || 0,    icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Total Redeemed',  value: loyalty.total_redeemed?.toLocaleString() || 0,  icon: Zap,        color: 'text-blue-400' },
          { label: 'KES Value',       value: `KES ${loyalty.kes_value?.toLocaleString() || 0}`, icon: Crown,   color: 'text-amber-400' },
          { label: 'Referrals',       value: loyalty.referral_stats?.completed_referrals || 0, icon: Users,   color: 'text-purple-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <GlassCard key={label} className="p-4">
            <Icon size={16} className={`${color} mb-2`} />
            <p className="text-white font-bold text-xl">{value}</p>
            <p className="text-white/40 text-xs">{label}</p>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* ── Actions ───────────────────────────────────── */}
        <GlassCard className="p-5">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4">
            Quick Actions
          </p>
          <div className="space-y-3">

            {/* Redeem Points */}
            <button onClick={() => setShowRedeem(true)} disabled={points < 100}
              className="w-full flex items-center gap-3 p-3 bg-blue-500/10 hover:bg-blue-500/20
                border border-blue-500/20 rounded-xl transition-all disabled:opacity-40">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Zap size={16} className="text-blue-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-white text-sm font-semibold">Redeem Points</p>
                <p className="text-white/40 text-xs">100 points = KES 10 discount</p>
              </div>
              <p className="text-blue-400 font-bold text-sm">{points.toLocaleString()} pts</p>
            </button>

            {/* Referral Code */}
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Users size={16} className="text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-semibold">Your Referral Code</p>
                  <p className="text-white/40 text-xs">Share and earn 500 points per referral</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5
                  text-white font-mono font-bold text-sm text-center tracking-widest">
                  {loyalty.referral_code || '...'}
                </div>
                <button onClick={() => copyCode(loyalty.referral_code)}
                  className="p-2.5 bg-purple-500/20 hover:bg-purple-500/30
                    text-purple-400 rounded-xl border border-purple-500/30 transition-all">
                  {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            {/* Apply Referral */}
            <button onClick={() => setShowReferral(true)}
              className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10
                border border-white/10 rounded-xl transition-all">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <Gift size={16} className="text-white/50" />
              </div>
              <div className="text-left">
                <p className="text-white text-sm font-semibold">Apply a Referral Code</p>
                <p className="text-white/40 text-xs">Get 100 welcome bonus points</p>
              </div>
            </button>
          </div>
        </GlassCard>

        {/* ── How It Works ──────────────────────────────── */}
        <GlassCard className="p-5">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4">
            How It Works
          </p>
          <div className="space-y-3">
            {[
              { icon: '🔧', title: 'Earn Points',    desc: '1 point for every KES 100 spent on service' },
              { icon: '🎁', title: 'Redeem',         desc: '100 points = KES 10 discount on next service' },
              { icon: '👥', title: 'Refer Friends',  desc: 'Earn 500 points per successful referral' },
              { icon: '🥇', title: 'Climb Tiers',    desc: 'Bronze → Silver (1,000 pts) → Gold (5,000 pts)' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">{icon}</span>
                <div>
                  <p className="text-white text-sm font-semibold">{title}</p>
                  <p className="text-white/40 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* ── Transaction History ───────────────────────── */}
      <GlassCard className="p-5">
        <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4">
          Points History
        </p>
        {loyalty.history?.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-4">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {loyalty.history?.map((tx) => {
              const cfg  = TRANSACTION_ICONS[tx.transaction_type] || TRANSACTION_ICONS.earned;
              const Icon = cfg.icon;
              const isEarned = tx.transaction_type !== 'redeemed';
              return (
                <div key={tx.id} className="flex items-center gap-3 p-3
                  bg-white/5 rounded-xl border border-white/10">
                  <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center
                    justify-center flex-shrink-0`}>
                    <Icon size={14} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{tx.description}</p>
                    <p className="text-white/30 text-xs">
                      {new Date(tx.created_at).toLocaleDateString('en-KE')}
                      {tx.garage_name && ` • ${tx.garage_name}`}
                    </p>
                  </div>
                  <p className={`font-bold text-sm flex-shrink-0
                    ${isEarned ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isEarned ? '+' : '-'}{tx.points.toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* ── Redeem Modal ──────────────────────────────── */}
      {showRedeem && (
        <Modal isOpen={showRedeem} onClose={() => setShowRedeem(false)} title="Redeem Points" size="sm">
          <div className="space-y-4">
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-center">
              <p className="text-white/50 text-xs">Available Points</p>
              <p className="text-white font-black text-3xl">{points.toLocaleString()}</p>
              <p className="text-blue-300 text-xs">= KES {loyalty.kes_value?.toLocaleString()} value</p>
            </div>
            <div>
              <label className="text-white/60 text-xs font-medium mb-1 block">
                Points to Redeem (min 100)
              </label>
              <input type="number" min={100} max={points} step={100}
                placeholder="e.g. 500"
                value={redeemPoints} onChange={(e) => setRedeemPoints(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5
                  text-white placeholder-white/30 text-sm focus:outline-none
                  focus:ring-2 focus:ring-blue-500/50" />
              {redeemPoints && (
                <p className="text-blue-400 text-xs mt-1">
                  = KES {Math.floor(parseInt(redeemPoints || 0) / 10).toLocaleString()} discount
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowRedeem(false)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                  rounded-xl py-2.5 text-sm border border-white/20 transition-all">
                Cancel
              </button>
              <button
                onClick={() => redeemMutation.mutate({ points: parseInt(redeemPoints) })}
                disabled={redeemMutation.isPending || !redeemPoints || parseInt(redeemPoints) < 100}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white
                  font-semibold rounded-xl py-2.5 text-sm transition-all disabled:opacity-50
                  flex items-center justify-center gap-2">
                {redeemMutation.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Redeeming...</>
                  : 'Redeem Points'
                }
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Apply Referral Modal ──────────────────────── */}
      {showReferral && (
        <Modal isOpen={showReferral} onClose={() => setShowReferral(false)} title="Apply Referral Code" size="sm">
          <div className="space-y-4">
            <p className="text-white/60 text-sm">
              Enter a friend's referral code to earn 100 bonus points!
            </p>
            <input type="text" placeholder="Enter code e.g. AB12CD34"
              value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5
                text-white placeholder-white/30 text-sm text-center font-mono font-bold
                tracking-widest focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
            <div className="flex gap-3">
              <button onClick={() => setShowReferral(false)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                  rounded-xl py-2.5 text-sm border border-white/20 transition-all">
                Cancel
              </button>
              <button
                onClick={() => referralMutation.mutate({ code: referralCode })}
                disabled={referralMutation.isPending || referralCode.length < 6}
                className="flex-1 bg-gradient-to-r from-purple-500 to-violet-500 text-white
                  font-semibold rounded-xl py-2.5 text-sm transition-all disabled:opacity-50
                  flex items-center justify-center gap-2">
                {referralMutation.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Applying...</>
                  : 'Apply Code'
                }
              </button>
            </div>
          </div>
        </Modal>
      )}
    </PageWrapper>
  );
};

export default LoyaltyPage;