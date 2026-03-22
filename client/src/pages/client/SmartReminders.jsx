import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Bell, AlertTriangle, Shield, FileText, Wrench,
  Calendar, CheckCircle, ChevronRight, Clock,
  RefreshCw, Car,
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Spinner from '../../components/common/Spinner';
import toast from 'react-hot-toast';

const fetchReminders = () => axiosInstance.get('/reminders/smart').then(r => r.data);

const ALERT_CONFIG = {
  insurance_expiry:     { icon: Shield,    color: 'amber',   bg: 'bg-amber-500/20',  border: 'border-amber-500/30',  text: 'text-amber-400' },
  pending_quote:        { icon: FileText,  color: 'blue',    bg: 'bg-blue-500/20',   border: 'border-blue-500/30',   text: 'text-blue-400' },
  unpaid_invoice:       { icon: AlertTriangle, color: 'rose', bg: 'bg-rose-500/20',  border: 'border-rose-500/30',   text: 'text-rose-400' },
  maintenance_reminder: { icon: Wrench,    color: 'purple',  bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400' },
  service_due:          { icon: Car,       color: 'emerald', bg: 'bg-emerald-500/20',border: 'border-emerald-500/30',text: 'text-emerald-400' },
};

const PRIORITY_BADGE = {
  critical: 'bg-red-500/30 text-red-300 border-red-500/40',
  high:     'bg-amber-500/20 text-amber-300 border-amber-500/30',
  medium:   'bg-blue-500/20 text-blue-300 border-blue-500/30',
  low:      'bg-white/10 text-white/50 border-white/20',
};

const SmartReminders = () => {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['smartReminders'],
    queryFn: fetchReminders,
    refetchInterval: 5 * 60 * 1000, // refresh every 5 min
  });

  const dismissMutation = useMutation({
    mutationFn: (reminderId) =>
      axiosInstance.put(`/vehicles-enhanced/reminders/${reminderId}`, { action: 'dismiss' }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['smartReminders']);
      toast.success('Reminder dismissed.');
    },
  });

  const completeMutation = useMutation({
    mutationFn: (reminderId) =>
      axiosInstance.put(`/vehicles-enhanced/reminders/${reminderId}`, { action: 'complete' }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries(['smartReminders']);
      toast.success('Reminder marked as complete!');
    },
  });

  const handleAction = (alert) => {
    switch (alert.action) {
      case 'view_quote':    return navigate('/client/quotes');
      case 'pay_invoice':   return navigate('/client/invoices');
      case 'book_service':  return navigate('/client/appointments');
      case 'renew_insurance':
      case 'view_vehicle':  return navigate(`/client/vehicles/${alert.vehicle_id}`);
      default: return;
    }
  };

  const alerts  = data?.data || [];
  const unread  = data?.unread || 0;
  const critical = alerts.filter(a => a.priority === 'critical');
  const high     = alerts.filter(a => a.priority === 'high');
  const medium   = alerts.filter(a => a.priority === 'medium');
  const low      = alerts.filter(a => a.priority === 'low');

  return (
    <PageWrapper
      title="Smart Reminders"
      subtitle="All your vehicle alerts and action items in one place."
    >
      {/* ── Header Stats ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Alerts',  value: alerts.length,  color: 'text-white',        bg: 'bg-white/10' },
          { label: 'Action Needed', value: unread,         color: 'text-amber-400',     bg: 'bg-amber-500/10' },
          { label: 'Critical',      value: critical.length, color: 'text-red-400',      bg: 'bg-red-500/10' },
          { label: 'Low Priority',  value: low.length,     color: 'text-emerald-400',   bg: 'bg-emerald-500/10' },
        ].map(({ label, value, color, bg }) => (
          <GlassCard key={label} className={`p-4 ${bg}`}>
            <p className={`font-bold text-2xl ${color}`}>{value}</p>
            <p className="text-white/40 text-xs mt-0.5">{label}</p>
          </GlassCard>
        ))}
      </div>

      {/* ── Refresh Button ───────────────────────────────── */}
      <div className="flex justify-end mb-4">
        <button onClick={() => refetch()}
          className="flex items-center gap-2 text-white/40 hover:text-white/70
            text-xs transition-colors">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="md" text="Loading your alerts..." />
        </div>
      ) : alerts.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30
            flex items-center justify-center">
            <CheckCircle size={28} className="text-emerald-400" />
          </div>
          <p className="text-white font-semibold">You're all caught up!</p>
          <p className="text-white/40 text-sm text-center">
            No alerts or reminders at the moment. We'll notify you when something needs attention.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const cfg  = ALERT_CONFIG[alert.type] || ALERT_CONFIG.maintenance_reminder;
            const Icon = cfg.icon;
            const isReminder = alert.type === 'maintenance_reminder';

            return (
              <GlassCard key={alert.id}
                className={`p-4 border ${cfg.border} cursor-pointer
                  hover:bg-white/15 transition-all`}
                onClick={() => handleAction(alert)}>
                <div className="flex items-start gap-4">

                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl ${cfg.bg} border ${cfg.border}
                    flex items-center justify-center flex-shrink-0`}>
                    <Icon size={18} className={cfg.text} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                      <p className="text-white font-semibold text-sm">{alert.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border capitalize
                        font-medium flex-shrink-0 ${PRIORITY_BADGE[alert.priority] || PRIORITY_BADGE.low}`}>
                        {alert.priority}
                      </span>
                    </div>
                    <p className="text-white/60 text-xs leading-relaxed">{alert.message}</p>

                    {/* Action hint */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-white/30 text-xs capitalize">
                        {alert.type.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        {/* Complete / Dismiss for manual reminders */}
                        {isReminder && alert.reminder_id && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); completeMutation.mutate(alert.reminder_id); }}
                              className="flex items-center gap-1 text-emerald-400/60
                                hover:text-emerald-400 text-xs transition-colors">
                              <CheckCircle size={12} /> Done
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); dismissMutation.mutate(alert.reminder_id); }}
                              className="flex items-center gap-1 text-white/20
                                hover:text-white/50 text-xs transition-colors">
                              Dismiss
                            </button>
                          </>
                        )}
                        <ChevronRight size={14} className="text-white/30" />
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
};

export default SmartReminders;