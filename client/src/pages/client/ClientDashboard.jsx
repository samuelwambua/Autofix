import { useQuery } from '@tanstack/react-query';
import {
  Car, Calendar, FileText, Star,
  CheckCircle, Clock, TrendingUp, Bell, Plus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import useAuthStore from '../../store/authStore';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import StatCard from '../../components/common/StatCard';

const fetchClientDashboard = async () => {
  const res = await axiosInstance.get('/dashboard/client');
  return res.data;
};

const getApptBadge = (status) => {
  const map = {
    pending:   { variant: 'warning', label: 'Pending' },
    confirmed: { variant: 'info',    label: 'Confirmed' },
    completed: { variant: 'success', label: 'Completed' },
    cancelled: { variant: 'danger',  label: 'Cancelled' },
  };
  return map[status] || { variant: 'neutral', label: status };
};

const ClientDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['clientDashboard'],
    queryFn: fetchClientDashboard,
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

  const d                  = data?.data || {};
  const vehicles           = d.vehicles || [];
  const activeAppointments = d.active_appointments || [];
  const activeJobs         = d.active_jobs || [];
  const pendingInvoices    = d.pending_invoices || [];
  const totalSpent         = parseFloat(d.total_spent || 0);
  const notifications      = parseInt(d.unread_notifications || 0);

  // Appointment stats
  const apptStats    = d.appointment_stats || [];
  const confirmedCount = parseInt(apptStats.find(s => s.status === 'confirmed')?.count || 0);
  const cancelledCount = parseInt(apptStats.find(s => s.status === 'cancelled')?.count || 0);

  return (
    <PageWrapper
      title={`Welcome, ${user?.first_name || 'Client'} 👋`}
      subtitle="Here's an overview of your vehicles and services."
    >
      {/* ── Stat Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="My Vehicles"     value={vehicles.length}                          icon={Car}       color="blue" />
        <StatCard title="Appointments"    value={confirmedCount}                           icon={Calendar}  color="emerald" />
        <StatCard title="Total Spent"     value={`KES ${totalSpent.toLocaleString()}`}     icon={TrendingUp} color="purple" />
        <StatCard title="Notifications"   value={notifications}                            icon={Bell}      color={notifications > 0 ? 'rose' : 'blue'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── My Vehicles ───────────────────────────────── */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">
              My Vehicles
            </p>
            <button
              onClick={() => navigate('/client/vehicles')}
              className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
            >
              View All →
            </button>
          </div>
          {vehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Car size={28} className="text-white/20" />
              <p className="text-white/30 text-sm">No vehicles registered yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vehicles.map((v) => (
                <div key={v.id} className="flex items-center gap-3 p-3
                  bg-white/5 rounded-xl border border-white/10">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center
                    justify-center flex-shrink-0">
                    <Car size={16} className="text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold">
                      {v.make} {v.model} {v.year}
                    </p>
                    <p className="text-white/40 text-xs font-mono">{v.plate_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/40 text-xs">{v.color}</p>
                    <p className="text-white/30 text-xs">{v.mileage?.toLocaleString()} km</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* ── Upcoming Appointments ─────────────────────── */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">
              Upcoming Appointments
            </p>
            <button
              onClick={() => navigate('/client/appointments')}
              className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
            >
              View All →
            </button>
          </div>
          {activeAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Calendar size={28} className="text-white/20" />
              <p className="text-white/30 text-sm">No upcoming appointments.</p>
              <button
                onClick={() => navigate('/client/appointments')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                  bg-blue-500/20 hover:bg-blue-500/30 text-blue-300
                  text-xs font-semibold transition-all"
              >
                <Plus size={12} /> Book Appointment
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeAppointments.map((a) => {
                const badge = getApptBadge(a.status);
                return (
                  <div key={a.id} className="flex items-start gap-3 p-3
                    bg-white/5 rounded-xl border border-white/10">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center
                      justify-center flex-shrink-0">
                      <Calendar size={16} className="text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {a.service_type}
                      </p>
                      <p className="text-white/40 text-xs mt-0.5">
                        {a.vehicle_name} • {a.plate_number}
                      </p>
                      <p className="text-white/30 text-xs mt-0.5">
                        {new Date(a.appointment_date).toLocaleDateString('en-KE', {
                          weekday: 'short', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <Badge label={badge.label} variant={badge.variant} />
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* ── Active Jobs ───────────────────────────────── */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">
              Active Job Cards
            </p>
            <button
              onClick={() => navigate('/client/jobs')}
              className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
            >
              View All →
            </button>
          </div>
          {activeJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CheckCircle size={28} className="text-white/20" />
              <p className="text-white/30 text-sm">No active jobs right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeJobs.map((job) => (
                <div key={job.id} className="flex items-start gap-3 p-3
                  bg-white/5 rounded-xl border border-white/10">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center
                    justify-center flex-shrink-0">
                    <Clock size={16} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {job.description}
                    </p>
                    <p className="text-white/40 text-xs mt-0.5">
                      {job.vehicle_name} • {job.plate_number}
                    </p>
                  </div>
                  <Badge label={job.status?.replace('_', ' ')} variant="warning" />
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* ── Pending Invoices ──────────────────────────── */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">
              Pending Invoices
            </p>
            <button
              onClick={() => navigate('/client/invoices')}
              className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
            >
              View All →
            </button>
          </div>
          {pendingInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <FileText size={28} className="text-white/20" />
              <p className="text-white/30 text-sm">No pending invoices.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 p-3
                  bg-white/5 rounded-xl border border-white/10">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center
                    justify-center flex-shrink-0">
                    <FileText size={16} className="text-rose-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold">
                      KES {parseFloat(inv.total_amount).toLocaleString()}
                    </p>
                    <p className="text-white/40 text-xs truncate">{inv.job_description}</p>
                  </div>
                  <Badge label="Pending" variant="warning" />
                </div>
              ))}
            </div>
          )}
        </GlassCard>

      </div>
    </PageWrapper>
  );
};

export default ClientDashboard;