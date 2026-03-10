import { useQuery } from '@tanstack/react-query';
import {
  Users, UserCircle, Car, Calendar,
  ClipboardList, FileText, Package, TrendingUp,
  Star, AlertTriangle, CheckCircle, Clock,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie,
  Cell, Legend,
} from 'recharts';
import { getAdminDashboardApi } from '../../api/dashboardApi';
import PageWrapper from '../../components/layout/PageWrapper';
import StatCard from '../../components/common/StatCard';
import GlassCard from '../../components/common/GlassCard';
import Spinner from '../../components/common/Spinner';
import Badge from '../../components/common/Badge';

// ─── Helpers ──────────────────────────────────────────────
const formatCurrency = (amount) =>
  `KES ${parseFloat(amount || 0).toLocaleString()}`;

const getJobStatusBadge = (status) => {
  const map = {
    received:       { variant: 'info',    label: 'Received' },
    diagnosing:     { variant: 'warning', label: 'Diagnosing' },
    awaiting_parts: { variant: 'warning', label: 'Awaiting Parts' },
    in_progress:    { variant: 'info',    label: 'In Progress' },
    quality_check:  { variant: 'purple',  label: 'Quality Check' },
    completed:      { variant: 'success', label: 'Completed' },
  };
  return map[status] || { variant: 'neutral', label: status };
};

const getAppointmentBadge = (status) => {
  const map = {
    pending:   { variant: 'warning', label: 'Pending' },
    confirmed: { variant: 'success', label: 'Confirmed' },
    cancelled: { variant: 'danger',  label: 'Cancelled' },
    completed: { variant: 'info',    label: 'Completed' },
  };
  return map[status] || { variant: 'neutral', label: status };
};

// ─── Custom Tooltip for charts ────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800/90 backdrop-blur border border-white/20
        rounded-xl px-4 py-3 shadow-xl">
        <p className="text-white/60 text-xs mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-white font-semibold text-sm">
            {p.name === 'revenue' ? formatCurrency(p.value) : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Pie chart colors ─────────────────────────────────────
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const AdminDashboard = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: getAdminDashboardApi,
    refetchInterval: 60000, // refetch every 60 seconds
  });

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-96">
          <Spinner size="lg" text="Loading dashboard..." />
        </div>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-96">
          <p className="text-red-400">Failed to load dashboard. Please refresh.</p>
        </div>
      </PageWrapper>
    );
  }

  const {
    counts,
    billing_stats,
    inventory_alerts,
    job_stats,
    appointment_stats,
    recent_jobs,
    recent_appointments,
    top_mechanics,
    monthly_revenue,
  } = data.data;

  // Build pie data for job statuses
  const jobPieData = job_stats.map((j) => ({
    name: j.status.replace(/_/g, ' '),
    value: parseInt(j.count),
  }));

  // Build pie data for appointment statuses
  const apptPieData = appointment_stats.map((a) => ({
    name: a.status,
    value: parseInt(a.count),
  }));

  return (
    <PageWrapper
      title="Dashboard"
      subtitle="Welcome back! Here's what's happening at AutoFix today."
    >
      {/* ── Stat Cards Row ───────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Clients"
          value={counts.total_clients}
          icon={UserCircle}
          color="blue"
        />
        <StatCard
          title="Total Staff"
          value={counts.total_staff}
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Total Vehicles"
          value={counts.total_vehicles}
          icon={Car}
          color="cyan"
        />
        <StatCard
          title="Total Appointments"
          value={counts.total_appointments}
          icon={Calendar}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Jobs"
          value={counts.total_jobs}
          icon={ClipboardList}
          color="emerald"
        />
        <StatCard
          title="Total Invoices"
          value={counts.total_invoices}
          icon={FileText}
          color="rose"
        />
        <StatCard
          title="Total Collected"
          value={formatCurrency(billing_stats.total_collected)}
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          title="Low Stock Parts"
          value={inventory_alerts.low_stock_count}
          icon={Package}
          color={parseInt(inventory_alerts.low_stock_count) > 0 ? 'rose' : 'emerald'}
        />
      </div>

      {/* ── Revenue Chart + Billing Summary ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

        {/* Revenue chart */}
        <GlassCard className="lg:col-span-2 p-6">
          <h3 className="text-white font-semibold mb-1">Monthly Revenue</h3>
          <p className="text-white/40 text-xs mb-6">Last 6 months collected revenue</p>
          {monthly_revenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthly_revenue}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#revenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <p className="text-white/30 text-sm">No revenue data yet</p>
            </div>
          )}
        </GlassCard>

        {/* Billing Summary */}
        <GlassCard className="p-6">
          <h3 className="text-white font-semibold mb-1">Billing Summary</h3>
          <p className="text-white/40 text-xs mb-6">Overall invoice breakdown</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-white/60 text-sm">Collected</span>
              </div>
              <span className="text-white font-semibold text-sm">
                {formatCurrency(billing_stats.total_collected)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-white/60 text-sm">Pending</span>
              </div>
              <span className="text-white font-semibold text-sm">
                {formatCurrency(billing_stats.total_pending)}
              </span>
            </div>
            <div className="h-px bg-white/10 my-2" />
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm font-medium">Total Billed</span>
              <span className="text-blue-400 font-bold text-sm">
                {formatCurrency(billing_stats.total_billed)}
              </span>
            </div>
            <div className="h-px bg-white/10 my-2" />
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                <p className="text-emerald-400 font-bold text-lg">{billing_stats.paid_invoices}</p>
                <p className="text-white/40 text-xs mt-0.5">Paid</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                <p className="text-amber-400 font-bold text-lg">{billing_stats.pending_invoices}</p>
                <p className="text-white/40 text-xs mt-0.5">Pending</p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
                <p className="text-blue-400 font-bold text-lg">{counts.total_invoices}</p>
                <p className="text-white/40 text-xs mt-0.5">Total</p>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* ── Job Stats + Appointment Stats ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

        {/* Job status pie */}
        <GlassCard className="p-6">
          <h3 className="text-white font-semibold mb-1">Job Card Status</h3>
          <p className="text-white/40 text-xs mb-4">Breakdown of all job cards</p>
          {jobPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={jobPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {jobPieData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }} />
                <Legend wrapperStyle={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <p className="text-white/30 text-sm">No job data yet</p>
            </div>
          )}
        </GlassCard>

        {/* Appointment status pie */}
        <GlassCard className="p-6">
          <h3 className="text-white font-semibold mb-1">Appointment Status</h3>
          <p className="text-white/40 text-xs mb-4">Breakdown of all appointments</p>
          {apptPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={apptPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {apptPieData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }} />
                <Legend wrapperStyle={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <p className="text-white/30 text-sm">No appointment data yet</p>
            </div>
          )}
        </GlassCard>
      </div>

      {/* ── Recent Jobs + Top Mechanics ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

        {/* Recent Jobs */}
        <GlassCard className="lg:col-span-2 p-6">
          <h3 className="text-white font-semibold mb-1">Recent Jobs</h3>
          <p className="text-white/40 text-xs mb-4">Latest 5 job cards</p>
          {recent_jobs.length > 0 ? (
            <div className="space-y-3">
              {recent_jobs.map((job) => {
                const badge = getJobStatusBadge(job.status);
                return (
                  <div key={job.id}
                    className="flex items-center gap-3 p-3
                      bg-white/5 rounded-xl border border-white/10">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/20
                      flex items-center justify-center flex-shrink-0">
                      <ClipboardList size={16} className="text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {job.description}
                      </p>
                      <p className="text-white/40 text-xs truncate">
                        {job.vehicle_name} • {job.plate_number} • {job.client_name}
                      </p>
                    </div>
                    <Badge label={badge.label} variant={badge.variant} />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-white/30 text-sm text-center py-8">No jobs yet</p>
          )}
        </GlassCard>

        {/* Top Mechanics */}
        <GlassCard className="p-6">
          <h3 className="text-white font-semibold mb-1">Top Mechanics</h3>
          <p className="text-white/40 text-xs mb-4">By completed jobs</p>
          {top_mechanics.length > 0 ? (
            <div className="space-y-3">
              {top_mechanics.map((m, index) => (
                <div key={m.id}
                  className="flex items-center gap-3 p-3
                    bg-white/5 rounded-xl border border-white/10">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center
                    text-xs font-bold flex-shrink-0
                    ${index === 0 ? 'bg-amber-500/20 text-amber-400' :
                      index === 1 ? 'bg-slate-400/20 text-slate-300' :
                      index === 2 ? 'bg-orange-700/20 text-orange-400' :
                      'bg-white/10 text-white/40'}`}>
                    #{index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {m.mechanic_name}
                    </p>
                    <p className="text-white/40 text-xs">
                      {m.completed_jobs} jobs
                      {m.average_rating && ` • ⭐ ${m.average_rating}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/30 text-sm text-center py-8">No mechanics yet</p>
          )}
        </GlassCard>
      </div>

      {/* ── Recent Appointments ───────────────────────── */}
      <GlassCard className="p-6">
        <h3 className="text-white font-semibold mb-1">Recent Appointments</h3>
        <p className="text-white/40 text-xs mb-4">Latest 5 appointments</p>
        {recent_appointments.length > 0 ? (
          <div className="space-y-3">
            {recent_appointments.map((appt) => {
              const badge = getAppointmentBadge(appt.status);
              return (
                <div key={appt.id}
                  className="flex items-center gap-3 p-3
                    bg-white/5 rounded-xl border border-white/10">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20
                    flex items-center justify-center flex-shrink-0">
                    <Calendar size={16} className="text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">
                      {appt.service_type}
                    </p>
                    <p className="text-white/40 text-xs">
                      {appt.client_name} • {appt.vehicle_name} •{' '}
                      {new Date(appt.appointment_date).toLocaleDateString('en-KE', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>
                  <Badge label={badge.label} variant={badge.variant} />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-white/30 text-sm text-center py-8">No appointments yet</p>
        )}
      </GlassCard>

    </PageWrapper>
  );
};

export default AdminDashboard;