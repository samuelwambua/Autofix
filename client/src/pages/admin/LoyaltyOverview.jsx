import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Crown, TrendingUp, Users, Gift, Plus } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axiosInstance';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';
import StatCard from '../../components/common/StatCard';

const fetchOverview  = () => axiosInstance.get('/loyalty/overview').then(r => r.data);
const fetchClients   = () => axiosInstance.get('/clients').then(r => r.data);

const LoyaltyOverview = () => {
  const queryClient = useQueryClient();
  const [showAward, setShowAward] = useState(false);
  const [awardForm, setAwardForm] = useState({ client_id: '', amount: '', description: '' });

  const { data, isLoading } = useQuery({ queryKey: ['loyaltyOverview'], queryFn: fetchOverview });
  const { data: clientsData } = useQuery({ queryKey: ['clients'], queryFn: fetchClients });

  const awardMutation = useMutation({
    mutationFn: (data) => axiosInstance.post('/loyalty/award', data).then(r => r.data),
    onSuccess: (d) => {
      toast.success(d.message);
      queryClient.invalidateQueries(['loyaltyOverview']);
      setShowAward(false);
      setAwardForm({ client_id: '', amount: '', description: '' });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed.'),
  });

  const clients  = clientsData?.data || [];
  const loyalty  = data?.data || [];
  const totalPoints = loyalty.reduce((a, c) => a + parseInt(c.current_points || 0), 0);
  const goldMembers = loyalty.filter(c => parseInt(c.current_points) >= 5000).length;
  const inputClass = 'w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50';

  return (
    <PageWrapper title="Loyalty Program" subtitle="Track client points and manage rewards.">

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Clients"  value={loyalty.length}  icon={Users}      color="blue" />
        <StatCard title="Total Points"   value={totalPoints.toLocaleString()} icon={Crown} color="amber" />
        <StatCard title="Gold Members"   value={goldMembers}     icon={Crown}      color="amber" />
        <StatCard title="KES Value"      value={`KES ${Math.floor(totalPoints/10).toLocaleString()}`} icon={TrendingUp} color="emerald" />
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={() => setShowAward(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500
            text-white font-semibold rounded-xl px-4 py-2 text-sm shadow-lg transition-all">
          <Plus size={15} /> Award Points
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="md" /></div>
      ) : (
        <GlassCard className="p-0 overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {['Client', 'Phone', 'Points', 'Tier', 'KES Value'].map(h => (
                    <th key={h} className="text-left text-white/40 text-xs font-semibold
                      uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loyalty.map((c, i) => {
                  const pts  = parseInt(c.current_points || 0);
                  const tier = pts >= 5000 ? 'Gold' : pts >= 1000 ? 'Silver' : 'Bronze';
                  const tierColor = tier === 'Gold' ? 'text-amber-400' : tier === 'Silver' ? 'text-slate-300' : 'text-orange-600';
                  return (
                    <tr key={c.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-white/20 text-xs w-4">{i+1}</span>
                          <p className="text-white text-sm font-medium">{c.client_name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/50 text-sm">{c.phone}</td>
                      <td className="px-4 py-3 text-white font-bold text-sm">{pts.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold ${tierColor}`}>{tier}</span>
                      </td>
                      <td className="px-4 py-3 text-emerald-400 text-sm font-medium">
                        KES {Math.floor(pts/10).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden divide-y divide-white/5">
            {loyalty.map((c) => {
              const pts  = parseInt(c.current_points || 0);
              const tier = pts >= 5000 ? '🥇 Gold' : pts >= 1000 ? '🥈 Silver' : '🥉 Bronze';
              return (
                <div key={c.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold text-sm">{c.client_name}</p>
                    <p className="text-white/30 text-xs">{tier}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-amber-400 font-bold">{pts.toLocaleString()} pts</p>
                    <p className="text-emerald-400 text-xs">KES {Math.floor(pts/10).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* ── Award Points Modal ─────────────────────────── */}
      {showAward && (
        <Modal isOpen={showAward} onClose={() => setShowAward(false)} title="Award Bonus Points" size="sm">
          <div className="space-y-3">
            <div>
              <label className="text-white/60 text-xs font-medium mb-1 block">Client *</label>
              <select value={awardForm.client_id}
                onChange={(e) => setAwardForm({ ...awardForm, client_id: e.target.value })}
                className={inputClass}>
                <option value="" className="bg-slate-800">Select client</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id} className="bg-slate-800">
                    {c.first_name} {c.last_name} — {c.phone}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-white/60 text-xs font-medium mb-1 block">Amount Spent (KES) *</label>
              <input type="number" placeholder="e.g. 5000"
                value={awardForm.amount}
                onChange={(e) => setAwardForm({ ...awardForm, amount: e.target.value })}
                className={inputClass} />
              {awardForm.amount && (
                <p className="text-amber-400 text-xs mt-1">
                  = {Math.floor(parseFloat(awardForm.amount || 0) / 100)} points
                </p>
              )}
            </div>
            <div>
              <label className="text-white/60 text-xs font-medium mb-1 block">Description</label>
              <input placeholder="e.g. Service payment bonus"
                value={awardForm.description}
                onChange={(e) => setAwardForm({ ...awardForm, description: e.target.value })}
                className={inputClass} />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowAward(false)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                  rounded-xl py-2.5 text-sm border border-white/20 transition-all">
                Cancel
              </button>
              <button
                onClick={() => awardMutation.mutate(awardForm)}
                disabled={awardMutation.isPending || !awardForm.client_id || !awardForm.amount}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white
                  font-semibold rounded-xl py-2.5 text-sm transition-all disabled:opacity-50
                  flex items-center justify-center gap-2">
                {awardMutation.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Awarding...</>
                  : <><Gift size={14} /> Award Points</>
                }
              </button>
            </div>
          </div>
        </Modal>
      )}
    </PageWrapper>
  );
};

export default LoyaltyOverview;