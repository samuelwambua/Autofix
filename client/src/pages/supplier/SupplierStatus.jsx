import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Clock, CheckCircle, XCircle, AlertTriangle,
  FileText, Store, LogOut, RefreshCw,
} from 'lucide-react';
import supplierAxios from '../../api/supplierAxios';
import useSupplierStore from '../../store/supplierStore';

const fetchStatus = () => supplierAxios.get('/supplier/auth/status').then(r => r.data);

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    color: 'text-amber-400',
    bg:    'bg-amber-500/20',
    border:'border-amber-500/30',
    title: 'Application Under Review',
    desc:  'Your application has been submitted and is being reviewed by our team. This usually takes 1-2 business days.',
    steps: [
      { label: 'Application Submitted',    done: true },
      { label: 'Documents Under Review',   done: true },
      { label: 'Verification in Progress', done: false, active: true },
      { label: 'Account Activated',        done: false },
    ],
  },
  active: {
    icon: CheckCircle,
    color: 'text-emerald-400',
    bg:    'bg-emerald-500/20',
    border:'border-emerald-500/30',
    title: 'Account Approved! 🎉',
    desc:  'Congratulations! Your supplier account has been verified. You can now access your dashboard.',
    steps: [
      { label: 'Application Submitted',  done: true },
      { label: 'Documents Reviewed',     done: true },
      { label: 'Verification Complete',  done: true },
      { label: 'Account Activated',      done: true },
    ],
  },
  rejected: {
    icon: XCircle,
    color: 'text-red-400',
    bg:    'bg-red-500/20',
    border:'border-red-500/30',
    title: 'Application Rejected',
    desc:  'Unfortunately your application was not approved. Please review the reason below and reapply.',
    steps: [
      { label: 'Application Submitted',  done: true },
      { label: 'Documents Reviewed',     done: true },
      { label: 'Application Rejected',   done: true, failed: true },
    ],
  },
  suspended: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bg:    'bg-red-500/20',
    border:'border-red-500/30',
    title: 'Account Suspended',
    desc:  'Your account has been suspended. Please contact support for assistance.',
    steps: [],
  },
};

const SupplierStatus = () => {
  const navigate = useNavigate();
  const { supplier, logoutSupplier } = useSupplierStore();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['supplierStatus'],
    queryFn:  fetchStatus,
    refetchInterval: 30000,
  });

  const status = data?.data?.status || supplier?.status || 'pending';
  const cfg    = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon   = cfg.icon;
  const docs   = data?.data?.documents || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-950 to-amber-900
        flex items-center justify-center">
        <div className="text-white/50 text-sm">Loading status...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-950 to-amber-900
      flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500
              flex items-center justify-center">
              <Store size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">{supplier?.business_name}</p>
              <p className="text-white/40 text-xs">Supplier Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()}
              className="p-2 text-white/40 hover:text-white/70 transition-colors">
              <RefreshCw size={15} />
            </button>
            <button onClick={() => { logoutSupplier(); navigate('/supplier/login'); }}
              className="p-2 text-white/40 hover:text-red-400 transition-colors">
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {/* Status Card */}
        <div className={`bg-white/10 backdrop-blur-xl border ${cfg.border}
          rounded-3xl p-6 shadow-2xl mb-4`}>

          <div className={`w-16 h-16 rounded-2xl ${cfg.bg} border ${cfg.border}
            flex items-center justify-center mx-auto mb-4`}>
            <Icon size={28} className={cfg.color} />
          </div>

          <h2 className="text-white font-black text-xl text-center mb-2">{cfg.title}</h2>
          <p className="text-white/60 text-sm text-center mb-6">{cfg.desc}</p>

          {/* Rejection reason */}
          {(status === 'rejected') && data?.data?.rejection_reason &&
            !data.data.rejection_reason.startsWith('[MORE INFO REQUIRED]') && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
              <p className="text-red-400/70 text-xs mb-1">Reason:</p>
              <p className="text-red-200 text-sm">{data.data.rejection_reason}</p>
            </div>
          )}

          {/* Request more info */}
          {data?.data?.rejection_reason?.startsWith('[MORE INFO REQUIRED]') && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4">
              <p className="text-amber-400/70 text-xs mb-1">More information requested:</p>
              <p className="text-amber-200 text-sm">
                {data.data.rejection_reason.replace('[MORE INFO REQUIRED] ', '')}
              </p>
            </div>
          )}

          {/* Timeline */}
          {cfg.steps.length > 0 && (
            <div className="space-y-3 mb-6">
              {cfg.steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
                    ${step.done && !step.failed ? 'bg-emerald-500/30 border border-emerald-500/40' :
                      step.failed ? 'bg-red-500/30 border border-red-500/40' :
                      step.active ? 'bg-amber-500/30 border border-amber-500/40 animate-pulse' :
                      'bg-white/10 border border-white/20'}`}>
                    {step.done && !step.failed && <CheckCircle size={12} className="text-emerald-400" />}
                    {step.failed && <XCircle size={12} className="text-red-400" />}
                    {step.active && !step.done && <div className="w-2 h-2 rounded-full bg-amber-400" />}
                  </div>
                  <p className={`text-sm
                    ${step.done && !step.failed ? 'text-white' :
                      step.failed ? 'text-red-400' :
                      step.active ? 'text-amber-300 font-semibold' : 'text-white/30'}`}>
                    {step.label}
                  </p>
                  {step.active && (
                    <span className="ml-auto text-xs bg-amber-500/20 text-amber-300
                      px-2 py-0.5 rounded-full border border-amber-500/30">In Progress</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Documents */}
          {docs.length > 0 && (
            <div className="mb-4">
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">
                Documents Submitted ({docs.length})
              </p>
              <div className="space-y-2">
                {docs.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 p-2.5
                    bg-white/5 rounded-xl border border-white/10">
                    <FileText size={13} className="text-white/40 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs truncate">{doc.file_name}</p>
                      <p className="text-white/30 text-xs capitalize">
                        {doc.document_type?.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <CheckCircle size={12} className="text-emerald-400 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {status === 'active' && (
            <button onClick={() => navigate('/supplier/dashboard')}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white
                font-bold rounded-xl py-3 shadow-lg shadow-orange-500/30 transition-all">
              Go to Dashboard →
            </button>
          )}
          {status === 'rejected' && (
            <button onClick={() => navigate('/supplier/register')}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white
                font-bold rounded-xl py-3 shadow-lg transition-all">
              Reapply
            </button>
          )}
          {status === 'pending' && (
            <p className="text-center text-white/30 text-xs">
              This page refreshes automatically every 30 seconds.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierStatus;