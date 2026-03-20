import { useQuery } from '@tanstack/react-query';
import {
  Building2, Users, UserCircle, TrendingUp,
  CheckCircle, Clock, AlertTriangle, BarChart3,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import axiosInstance from '../../api/axiosInstance';
import SuperAdminLayout from './SuperAdminLayout';
import GlassCard from '../../components/common/GlassCard';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import StatCard from '../../components/common/StatCard';

const fetchDashboard = () => axiosInstance.get('/super-admin/dashboard').then(r => r.data);

const fmt = (v) => `KES ${parseFloat(v || 0).toLocaleString()}`;

const SuperAdminDashboard = () => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['superAdminDashboard'],
    queryFn: fetchDashboard,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <SuperAdminLayout title="Dashboard">
        <div className="flex items-center justify-center py-32">
          <Spinner size="lg" text="Loading platform data..." />
        </div>
      </SuperAdminLayout>
    );
  }

  const d = data?.data || {};
  const gs = d.garage_stats || {};

  const statusBadge = (status) => {
    const map = {
      active:    { variant: 'success', label: 'Active' },
      pending:   { variant: 'warning', label: 'Pending' },
      suspended: { variant: 'danger',  label: 'Suspended' },
    };
    return map[status] || { variant: 'neutral', label: status };
  };

  return (
    <SuperAdminLayout
      title="Platform Dashboard"
      subtitle="Overview of all garages and platform activity."
    >
      {/* ── Stat Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Garages"  value={gs.total || 0}                          icon={Building2}   color="purple" />
        <StatCard title="Total Clients"  value={d.total_clients || 0}                   icon={UserCircle}  color="blue" />
        <StatCard title="Total Staff"    value={d.total_staff || 0}                     icon={Users}       color="emerald" />
        <StatCard title="Total Revenue"  value={fmt(d.total_revenue)}                   icon={TrendingUp}  color="amber" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Active Garages"    value={gs.active    || 0} icon={CheckCircle}   color="emerald" />
        <StatCard title="Pending Approval"  value={gs.pending   || 0} icon={Clock}         color="amber" />
        <StatCard title="Suspended"         value={gs.suspended || 0} icon={AlertTriangle} color="rose" />
        <StatCard title="Collected"         value={fmt(d.collected_revenue)} icon={BarChart3} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* ── Monthly Growth Chart ────────────────────────── */}
        <GlassCard className="p-5">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4">
            Garage Registrations — Last 6 Months
          </p>
          {d.monthly_growth?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={d.monthly_growth}>
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="count" name="Garages" radius={[6, 6, 0, 0]}>
                  {d.monthly_growth.map((_, i) => (
                    <Cell key={i} fill={`rgba(168,85,247,${0.5 + (i / d.monthly_growth.length) * 0.5})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48">
              <p className="text-white/30 text-sm">No data yet.</p>
            </div>
          )}
        </GlassCard>

        {/* ── Pending Approvals ────────────────────────────── */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">
              Pending Approvals
            </p>
            <button onClick={() => navigate('/super-admin/garages')}
              className="text-purple-400 hover:text-purple-300 text-xs transition-colors">
              View All →
            </button>
          </div>
          {!d.pending_garages?.length ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CheckCircle size={28} className="text-emerald-400/50" />
              <p className="text-white/30 text-sm">No pending approvals.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {d.pending_garages.map((g) => (
                <div key={g.id} className="flex items-center gap-3 p-3
                  bg-white/5 rounded-xl border border-white/10 hover:bg-white/10
                  transition-all cursor-pointer"
                  onClick={() => navigate('/super-admin/garages')}>
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center
                    justify-center flex-shrink-0">
                    <Building2 size={16} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{g.name}</p>
                    <p className="text-white/40 text-xs">{g.city} • {g.email}</p>
                  </div>
                  <Badge label="Pending" variant="warning" />
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* ── Garage Breakdown Table ────────────────────────── */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">
            All Garages
          </p>
          <button onClick={() => navigate('/super-admin/garages')}
            className="text-purple-400 hover:text-purple-300 text-xs transition-colors">
            Manage →
          </button>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {['Garage', 'City', 'Staff', 'Clients', 'Jobs', 'Revenue', 'Plan', 'Status'].map(h => (
                  <th key={h} className="text-left text-white/40 text-xs font-semibold
                    uppercase tracking-wider px-3 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {d.garage_breakdown?.map((g) => {
                const badge = statusBadge(g.status);
                return (
                  <tr key={g.id} className="hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => navigate('/super-admin/garages')}>
                    <td className="px-3 py-3 text-white text-sm font-medium">{g.name}</td>
                    <td className="px-3 py-3 text-white/60 text-sm">{g.city || '—'}</td>
                    <td className="px-3 py-3 text-white/60 text-sm">{g.staff_count}</td>
                    <td className="px-3 py-3 text-white/60 text-sm">{g.client_count}</td>
                    <td className="px-3 py-3 text-white/60 text-sm">{g.job_count}</td>
                    <td className="px-3 py-3 text-white/60 text-sm">
                      KES {parseFloat(g.total_revenue).toLocaleString()}
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs capitalize text-white/50 bg-white/10
                        px-2 py-1 rounded-lg">{g.subscription_plan}</span>
                    </td>
                    <td className="px-3 py-3">
                      <Badge label={badge.label} variant={badge.variant} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {d.garage_breakdown?.map((g) => {
            const badge = statusBadge(g.status);
            return (
              <div key={g.id} className="p-3 bg-white/5 rounded-xl border border-white/10
                cursor-pointer hover:bg-white/10 transition-all"
                onClick={() => navigate('/super-admin/garages')}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white font-semibold text-sm">{g.name}</p>
                  <Badge label={badge.label} variant={badge.variant} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { label: 'Staff',    value: g.staff_count },
                    { label: 'Clients',  value: g.client_count },
                    { label: 'Jobs',     value: g.job_count },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white/5 rounded-lg p-2 text-center">
                      <p className="text-white/40">{label}</p>
                      <p className="text-white font-bold">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </SuperAdminLayout>
  );
};

export default SuperAdminDashboard;