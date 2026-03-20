import { useQuery } from '@tanstack/react-query';
import {
  Building2, Users, UserCircle, TrendingUp, Calendar,
  ClipboardList, CheckCircle, Clock, AlertTriangle,
  BarChart3, PieChart, Activity,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  CartesianGrid, AreaChart, Area,
} from 'recharts';
import axiosInstance from '../../api/axiosInstance';
import SuperAdminLayout from './SuperAdminLayout';
import GlassCard from '../../components/common/GlassCard';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import StatCard from '../../components/common/StatCard';

const fetchDashboard = () => axiosInstance.get('/super-admin/dashboard').then(r => r.data);

const fmt = (v) => `KES ${parseFloat(v || 0).toLocaleString()}`;

// Custom tooltip for charts
const ChartTooltip = ({ active, payload, label, prefix = '', suffix = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 border border-white/20 rounded-xl p-3 shadow-xl">
      <p className="text-white/60 text-xs mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-white text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: {prefix}{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}{suffix}
        </p>
      ))}
    </div>
  );
};

const PLAN_COLORS   = { premium: '#f59e0b', basic: '#3b82f6', free: '#64748b' };
const STATUS_COLORS = { active: '#10b981', pending: '#f59e0b', suspended: '#ef4444' };
const JOB_COLORS    = {
  completed: '#10b981', in_progress: '#3b82f6', received: '#8b5cf6',
  diagnosing: '#f59e0b', awaiting_parts: '#f97316', quality_check: '#06b6d4',
};
const CHART_COLORS  = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

const SuperAdminDashboard = () => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['superAdminDashboard'],
    queryFn: fetchDashboard,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <SuperAdminLayout title="Analytics Dashboard">
        <div className="flex items-center justify-center py-32">
          <Spinner size="lg" text="Loading platform analytics..." />
        </div>
      </SuperAdminLayout>
    );
  }

  const d  = data?.data || {};
  const gs = d.garage_stats || {};

  // Prepare plan distribution data
  const planData = (d.plan_distribution || []).map(p => ({
    name: p.plan.charAt(0).toUpperCase() + p.plan.slice(1),
    value: parseInt(p.count),
    color: PLAN_COLORS[p.plan] || '#64748b',
  }));

  // Prepare garage status data
  const statusData = [
    { name: 'Active',    value: gs.active    || 0, color: STATUS_COLORS.active },
    { name: 'Pending',   value: gs.pending   || 0, color: STATUS_COLORS.pending },
    { name: 'Suspended', value: gs.suspended || 0, color: STATUS_COLORS.suspended },
  ].filter(s => s.value > 0);

  // Job status distribution
  const jobStatusData = (d.job_status_distribution || []).map(j => ({
    name: j.status.replace(/_/g, ' '),
    value: parseInt(j.count),
    color: JOB_COLORS[j.status] || '#64748b',
  }));

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
      title="Analytics Dashboard"
      subtitle="Platform-wide performance metrics and insights."
    >
      {/* ── Platform KPIs ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Garages"     value={gs.total || 0}               icon={Building2}    color="purple" />
        <StatCard title="Total Clients"     value={d.total_clients || 0}        icon={UserCircle}   color="blue" />
        <StatCard title="Total Staff"       value={d.total_staff || 0}          icon={Users}        color="emerald" />
        <StatCard title="Total Revenue"     value={fmt(d.total_revenue)}        icon={TrendingUp}   color="amber" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Active Garages"    value={gs.active    || 0}           icon={CheckCircle}  color="emerald" />
        <StatCard title="Pending Approval"  value={gs.pending   || 0}           icon={Clock}        color="amber" />
        <StatCard title="Appointments"      value={d.total_appointments || 0}   icon={Calendar}     color="blue" />
        <StatCard title="Collected"         value={fmt(d.collected_revenue)}    icon={BarChart3}    color="purple" />
      </div>

      {/* ── Revenue & Growth Charts ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Monthly Revenue */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-amber-400" />
            <p className="text-white/70 text-sm font-semibold">Platform Revenue — Last 6 Months</p>
          </div>
          {d.monthly_revenue?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={d.monthly_revenue}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip content={<ChartTooltip prefix="KES " />} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#f59e0b"
                  strokeWidth={2} fill="url(#revenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-52">
              <p className="text-white/30 text-sm">No revenue data yet.</p>
            </div>
          )}
        </GlassCard>

        {/* Garage Registrations Growth */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={16} className="text-purple-400" />
            <p className="text-white/70 text-sm font-semibold">Garage Registrations — Last 12 Months</p>
          </div>
          {d.monthly_growth?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={d.monthly_growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip suffix=" garages" />} />
                <Bar dataKey="count" name="New Garages" radius={[6, 6, 0, 0]}>
                  {d.monthly_growth.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-52">
              <p className="text-white/30 text-sm">No growth data yet.</p>
            </div>
          )}
        </GlassCard>
      </div>

      {/* ── Appointments & Distribution Charts ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Monthly Appointments */}
        <GlassCard className="p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={16} className="text-blue-400" />
            <p className="text-white/70 text-sm font-semibold">Appointments — Last 6 Months</p>
          </div>
          {d.monthly_appointments?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={d.monthly_appointments}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }} />
                <Bar dataKey="count"     name="Total"     fill="#3b82f6" radius={[4,4,0,0]} />
                <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48">
              <p className="text-white/30 text-sm">No appointment data yet.</p>
            </div>
          )}
        </GlassCard>

        {/* Subscription Plan Distribution */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChart size={16} className="text-emerald-400" />
            <p className="text-white/70 text-sm font-semibold">Subscription Plans</p>
          </div>
          {planData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <RechartsPie>
                  <Pie data={planData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                    paddingAngle={3} dataKey="value">
                    {planData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} garages`, n]} />
                </RechartsPie>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {planData.map((p) => (
                  <div key={p.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="text-white/60">{p.name}</span>
                    </div>
                    <span className="text-white font-semibold">{p.value} garages</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40">
              <p className="text-white/30 text-sm">No data yet.</p>
            </div>
          )}
        </GlassCard>
      </div>

      {/* ── Job Status & Garage Status ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Job Status Distribution */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList size={16} className="text-indigo-400" />
            <p className="text-white/70 text-sm font-semibold">Job Card Status Distribution</p>
          </div>
          {jobStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={jobStatusData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Jobs" radius={[0, 6, 6, 0]}>
                  {jobStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48">
              <p className="text-white/30 text-sm">No job data yet.</p>
            </div>
          )}
        </GlassCard>

        {/* Top Garages by Revenue */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-amber-400" />
            <p className="text-white/70 text-sm font-semibold">Top Garages by Revenue</p>
          </div>
          {d.top_garages_revenue?.filter(g => parseFloat(g.revenue) > 0).length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={d.top_garages_revenue.filter(g => parseFloat(g.revenue) > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v.length > 10 ? v.substring(0, 10) + '…' : v} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip content={<ChartTooltip prefix="KES " />} />
                <Bar dataKey="revenue" name="Revenue" radius={[6,6,0,0]}>
                  {(d.top_garages_revenue || []).map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48">
              <p className="text-white/30 text-sm">No revenue data yet.</p>
            </div>
          )}
        </GlassCard>
      </div>

      {/* ── All Garages Table ─────────────────────────────── */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-purple-400" />
            <p className="text-white/70 text-sm font-semibold">All Garages Performance</p>
          </div>
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
                {['Garage', 'Plan', 'Staff', 'Clients', 'Jobs', 'Revenue', 'Collected', 'Status'].map(h => (
                  <th key={h} className="text-left text-white/40 text-xs font-semibold
                    uppercase tracking-wider px-3 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {d.garage_breakdown?.map((g) => {
                const badge = statusBadge(g.status);
                const revenue   = parseFloat(g.total_revenue || 0);
                const collected = parseFloat(g.collected_revenue || 0);
                return (
                  <tr key={g.id} className="hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => navigate('/super-admin/garages')}>
                    <td className="px-3 py-3">
                      <p className="text-white text-sm font-medium">{g.name}</p>
                      <p className="text-white/30 text-xs">{g.city}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-lg capitalize font-medium
                        ${g.subscription_plan === 'premium' ? 'bg-amber-500/20 text-amber-300' :
                          g.subscription_plan === 'basic'   ? 'bg-blue-500/20 text-blue-300' :
                          'bg-white/10 text-white/40'}`}>
                        {g.subscription_plan}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-white/60 text-sm">{g.staff_count}</td>
                    <td className="px-3 py-3 text-white/60 text-sm">{g.client_count}</td>
                    <td className="px-3 py-3 text-white/60 text-sm">{g.job_count}</td>
                    <td className="px-3 py-3 text-white/60 text-sm">
                      {revenue > 0 ? `KES ${revenue.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-3 py-3 text-emerald-400 text-sm font-medium">
                      {collected > 0 ? `KES ${collected.toLocaleString()}` : '—'}
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
                cursor-pointer" onClick={() => navigate('/super-admin/garages')}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white font-semibold text-sm">{g.name}</p>
                  <Badge label={badge.label} variant={badge.variant} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { label: 'Staff',   value: g.staff_count },
                    { label: 'Clients', value: g.client_count },
                    { label: 'Jobs',    value: g.job_count },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white/5 rounded-lg p-2 text-center">
                      <p className="text-white/40">{label}</p>
                      <p className="text-white font-bold">{value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-emerald-400 text-xs mt-2 font-medium">
                  Revenue: KES {parseFloat(g.total_revenue||0).toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      </GlassCard>

    </SuperAdminLayout>
  );
};

export default SuperAdminDashboard;