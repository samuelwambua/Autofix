import { useQuery } from '@tanstack/react-query';
import {
  Wrench, CheckCircle, Clock, Star,
  Car, Calendar, TrendingUp, Bell,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import StatCard from '../../components/common/StatCard';
import useAuthStore from '../../store/authStore';

const fetchMechanicDashboard = async () => {
  const res = await axiosInstance.get('/dashboard/mechanic');
  return res.data;
};

const getStatusBadge = (status) => {
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

const MechanicDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['mechanicDashboard'],
    queryFn: fetchMechanicDashboard,
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

  const d             = data?.data || {};
  const jobStats      = d.job_stats || [];
  const activeJobs    = d.active_jobs || [];
  const recentDone    = d.recent_completed || [];
  const completedJobs = parseInt(d.completed_jobs || 0);
  const avgRating     = d.rating?.average_rating
    ? parseFloat(d.rating.average_rating).toFixed(1)
    : 'N/A';
  const totalReviews  = parseInt(d.rating?.total_reviews || 0);
  const notifications = parseInt(d.unread_notifications || 0);

  return (
    <PageWrapper
      title={`Welcome, ${user?.first_name || 'Mechanic'} 👋`}
      subtitle={user?.specialization || 'Mechanic Dashboard'}
    >
      {/* ── Stat Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Active Jobs"    value={activeJobs.length} icon={Wrench}      color="blue" />
        <StatCard title="Completed Jobs" value={completedJobs}     icon={CheckCircle} color="emerald" />
        <StatCard title="Avg Rating"     value={avgRating}         icon={Star}        color="amber" />
        <StatCard title="Notifications"  value={notifications}     icon={Bell}        color={notifications > 0 ? 'rose' : 'purple'} />
      </div>

      {/* ── Job Status Breakdown ─────────────────────────── */}
      {jobStats.length > 0 && (
        <GlassCard className="p-5 mb-6">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4">
            My Job Status Breakdown
          </p>
          <div className="flex flex-wrap gap-3">
            {jobStats.map((s) => {
              const badge = getStatusBadge(s.status);
              return (
                <div key={s.status} className="flex items-center gap-2 px-3 py-2
                  bg-white/5 rounded-xl border border-white/10">
                  <Badge label={badge.label} variant={badge.variant} />
                  <span className="text-white font-bold text-sm">{s.count}</span>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Active Jobs ───────────────────────────────── */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">
              Active Jobs
            </p>
            <button
              onClick={() => navigate('/mechanic/jobs')}
              className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
            >
              View All →
            </button>
          </div>
          {activeJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Wrench size={28} className="text-white/20" />
              <p className="text-white/30 text-sm">No active jobs right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeJobs.map((job) => {
                const badge = getStatusBadge(job.status);
                return (
                  <div
                    key={job.id}
                    onClick={() => navigate('/mechanic/jobs')}
                    className="flex items-start gap-3 p-3 bg-white/5 rounded-xl
                      border border-white/10 hover:bg-white/10 cursor-pointer transition-all"
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center
                      justify-center flex-shrink-0">
                      <Wrench size={14} className="text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {job.description}
                      </p>
                      <p className="text-white/40 text-xs mt-0.5">
                        {job.vehicle_name} • {job.plate_number}
                      </p>
                    </div>
                    <Badge label={badge.label} variant={badge.variant} />
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* ── Recently Completed ────────────────────────── */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">
              Recently Completed
            </p>
            <span className="text-white/30 text-xs">{recentDone.length} job{recentDone.length !== 1 ? 's' : ''}</span>
          </div>
          {recentDone.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CheckCircle size={28} className="text-white/20" />
              <p className="text-white/30 text-sm">No completed jobs yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentDone.map((job) => (
                <div key={job.id} className="flex items-start gap-3 p-3 bg-white/5
                  rounded-xl border border-white/10">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center
                    justify-center flex-shrink-0">
                    <CheckCircle size={14} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {job.description}
                    </p>
                    <p className="text-white/40 text-xs mt-0.5">
                      {job.vehicle_name} • {job.plate_number}
                    </p>
                    {job.actual_completion && (
                      <p className="text-white/25 text-xs mt-0.5">
                        Completed: {new Date(job.actual_completion).toLocaleDateString('en-KE')}
                      </p>
                    )}
                  </div>
                  <Badge label="Done" variant="success" />
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* ── My Performance ───────────────────────────── */}
        <GlassCard className="p-5 lg:col-span-2">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4">
            My Performance
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center justify-center p-4
              bg-white/5 rounded-xl border border-white/10 text-center">
              <TrendingUp size={20} className="text-blue-400 mb-2" />
              <p className="text-white text-2xl font-bold">{completedJobs}</p>
              <p className="text-white/40 text-xs mt-1">Jobs Completed</p>
            </div>
            <div className="flex flex-col items-center justify-center p-4
              bg-white/5 rounded-xl border border-white/10 text-center">
              <Star size={20} className="text-amber-400 mb-2" />
              <p className="text-white text-2xl font-bold">{avgRating}</p>
              <p className="text-white/40 text-xs mt-1">Average Rating</p>
            </div>
            <div className="flex flex-col items-center justify-center p-4
              bg-white/5 rounded-xl border border-white/10 text-center">
              <Car size={20} className="text-emerald-400 mb-2" />
              <p className="text-white text-2xl font-bold">{totalReviews}</p>
              <p className="text-white/40 text-xs mt-1">Client Reviews</p>
            </div>
          </div>
        </GlassCard>

      </div>
    </PageWrapper>
  );
};

export default MechanicDashboard;