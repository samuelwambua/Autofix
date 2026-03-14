import { useQuery } from '@tanstack/react-query';
import {
  Users, UserCircle, ClipboardList, TrendingUp,
  CheckCircle, Clock, Wrench, ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import useAuthStore from '../../store/authStore';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import StatCard from '../../components/common/StatCard';

const fetchSupervisorDashboard = async () => {
  const res = await axiosInstance.get('/supervisor/dashboard');
  return res.data;
};

const getJobBadge = (status) => {
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

const SupervisorDashboard = () => {
  const navigate = useNavigate();
  const { user }  = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['supervisorDashboard'],
    queryFn: fetchSupervisorDashboard,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900
        flex items-center justify-center">
        <Spinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  const d               = data?.data || {};
  const team            = d.team || [];
  const activeJobs      = d.active_jobs || [];
  const recentCompleted = d.recent_completed || [];
  const billing         = d.billing || {};
  const jobStats        = d.job_stats || [];

  const totalJobs     = jobStats.reduce((a, s) => a + parseInt(s.count), 0);
  const completedJobs = parseInt(jobStats.find(s => s.status === 'completed')?.count || 0);
  const activeCount   = totalJobs - completedJobs;

  return (
    <PageWrapper
      title={`Welcome, ${user?.first_name} 👋`}
      subtitle="Here's your team and operations overview."
    >
      {/* ── Stat Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Team Members"   value={team.length}                                        icon={Users}         color="blue" />
        <StatCard title="My Clients"     value={d.total_clients || 0}                               icon={UserCircle}    color="purple" />
        <StatCard title="Active Jobs"    value={activeCount}                                        icon={ClipboardList} color="amber" />
        <StatCard title="Total Billed"   value={`KES ${parseFloat(billing.total_billed||0).toLocaleString()}`} icon={TrendingUp}    color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* ── My Team ─────────────────────────────────────── */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">My Team</p>
            <button onClick={() => navigate('/supervisor/team')}
              className="text-blue-400 hover:text-blue-300 text-xs transition-colors">
              Manage →
            </button>
          </div>
          {team.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Users size={28} className="text-white/20" />
              <p className="text-white/30 text-sm">No mechanics on your team yet.</p>
              <button onClick={() => navigate('/supervisor/team')}
                className="text-blue-400 hover:text-blue-300 text-xs mt-1 transition-colors">
                Add mechanics →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {team.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3
                  bg-white/5 rounded-xl border border-white/10">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center
                    justify-center flex-shrink-0 text-emerald-400 font-bold text-sm">
                    {m.first_name.charAt(0)}{m.last_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold">
                      {m.first_name} {m.last_name}
                    </p>
                    <p className="text-white/40 text-xs truncate">
                      {m.specialization || 'General Mechanic'}
                    </p>
                  </div>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0
                    ${m.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* ── Billing Summary ──────────────────────────────── */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">
              Billing Summary
            </p>
            <button onClick={() => navigate('/supervisor/invoices')}
              className="text-blue-400 hover:text-blue-300 text-xs transition-colors">
              View All →
            </button>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Total Billed',   value: billing.total_billed   || 0, color: 'text-white' },
              { label: 'Collected',      value: billing.total_collected || 0, color: 'text-emerald-400' },
              { label: 'Pending',        value: billing.total_pending   || 0, color: 'text-amber-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between p-3
                bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/50 text-sm">{label}</p>
                <p className={`font-bold text-sm ${color}`}>
                  KES {parseFloat(value).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Active Jobs ───────────────────────────────────── */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">
              Active Jobs
            </p>
            <button onClick={() => navigate('/supervisor/job-cards')}
              className="text-blue-400 hover:text-blue-300 text-xs transition-colors">
              View All →
            </button>
          </div>
          {activeJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <ClipboardList size={28} className="text-white/20" />
              <p className="text-white/30 text-sm">No active jobs.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeJobs.map((job) => {
                const badge = getJobBadge(job.status);
                return (
                  <div key={job.id} className="flex items-start gap-3 p-3
                    bg-white/5 rounded-xl border border-white/10">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center
                      justify-center flex-shrink-0">
                      <Wrench size={13} className="text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {job.description}
                      </p>
                      <p className="text-white/40 text-xs mt-0.5">
                        {job.vehicle_name} • {job.plate_number}
                      </p>
                      {job.mechanic_name && (
                        <p className="text-white/30 text-xs">{job.mechanic_name}</p>
                      )}
                    </div>
                    <Badge label={badge.label} variant={badge.variant} />
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* ── Recently Completed ────────────────────────────── */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">
              Recently Completed
            </p>
            <button onClick={() => navigate('/supervisor/job-cards')}
              className="text-blue-400 hover:text-blue-300 text-xs transition-colors">
              View All →
            </button>
          </div>
          {recentCompleted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CheckCircle size={28} className="text-white/20" />
              <p className="text-white/30 text-sm">No completed jobs yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentCompleted.map((job) => (
                <div key={job.id} className="flex items-start gap-3 p-3
                  bg-white/5 rounded-xl border border-white/10">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center
                    justify-center flex-shrink-0">
                    <CheckCircle size={13} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {job.description}
                    </p>
                    <p className="text-white/40 text-xs mt-0.5">
                      {job.vehicle_name} • {job.plate_number}
                    </p>
                    {job.actual_completion && (
                      <p className="text-white/25 text-xs">
                        {new Date(job.actual_completion).toLocaleDateString('en-KE')}
                      </p>
                    )}
                  </div>
                  <Badge label="Done" variant="success" />
                </div>
              ))}
            </div>
          )}
        </GlassCard>

      </div>
    </PageWrapper>
  );
};

export default SupervisorDashboard;