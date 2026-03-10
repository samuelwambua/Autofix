import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserCircle, Search, Eye, UserX,
  Mail, Phone, Calendar, Car, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getAllClientsApi, deactivateClientApi } from '../../api/clientApi';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';

const ClientManagement = () => {
  const queryClient = useQueryClient();
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewClient, setViewClient]     = useState(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);

  // ─── Query ────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: getAllClientsApi,
  });

  // ─── Mutation ─────────────────────────────────────────
  const deactivateMutation = useMutation({
    mutationFn: deactivateClientApi,
    onSuccess: () => {
      toast.success('Client deactivated successfully.');
      queryClient.invalidateQueries(['clients']);
      setConfirmDeactivate(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to deactivate client.'),
  });

  // ─── Filter clients ───────────────────────────────────
  const clients = data?.data || [];
  const filtered = clients.filter((c) => {
    const matchSearch =
      `${c.first_name} ${c.last_name} ${c.email} ${c.phone}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && c.is_active) ||
      (statusFilter === 'inactive' && !c.is_active);
    return matchSearch && matchStatus;
  });

  return (
    <PageWrapper title="Client Management" subtitle="View and manage all registered clients.">

      {/* ── Top Bar ────────────────────────────────────── */}
      <GlassCard className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl
                  pl-9 pr-4 py-2 text-white placeholder-white/30 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-xl px-4 py-2
                text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="all"      className="bg-slate-800">All Clients</option>
              <option value="active"   className="bg-slate-800">Active</option>
              <option value="inactive" className="bg-slate-800">Inactive</option>
            </select>
          </div>
          {/* Count badge */}
          <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2">
            <span className="text-white/60 text-sm">
              Total: <span className="text-white font-semibold">{clients.length}</span>
            </span>
          </div>
        </div>
      </GlassCard>

      {/* ── Clients Table ───────────────────────────────── */}
      <GlassCard className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="md" text="Loading clients..." />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <UserCircle size={36} className="text-white/20" />
            <p className="text-white/40 text-sm">No clients found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {['Client', 'Contact', 'Joined', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-white/50 text-xs font-semibold
                      uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors">
                    {/* Client */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br
                          from-rose-500 to-pink-500 flex items-center justify-center
                          text-white text-xs font-bold flex-shrink-0">
                          {c.first_name?.charAt(0)}{c.last_name?.charAt(0)}
                        </div>
                        <p className="text-white text-sm font-medium">
                          {c.first_name} {c.last_name}
                        </p>
                      </div>
                    </td>
                    {/* Contact */}
                    <td className="px-4 py-3">
                      <p className="text-white/70 text-xs">{c.email || '—'}</p>
                      <p className="text-white/40 text-xs">{c.phone}</p>
                    </td>
                    {/* Joined */}
                    <td className="px-4 py-3">
                      <p className="text-white/60 text-xs">
                        {new Date(c.created_at).toLocaleDateString('en-KE', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </p>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <Badge
                        label={c.is_active ? 'Active' : 'Inactive'}
                        variant={c.is_active ? 'success' : 'danger'}
                      />
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewClient(c)}
                          className="p-1.5 rounded-lg text-white/40 hover:text-blue-400
                            hover:bg-blue-500/10 transition-all"
                          title="View"
                        >
                          <Eye size={15} />
                        </button>
                        {c.is_active && (
                          <button
                            onClick={() => setConfirmDeactivate(c)}
                            className="p-1.5 rounded-lg text-white/40 hover:text-red-400
                              hover:bg-red-500/10 transition-all"
                            title="Deactivate"
                          >
                            <UserX size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* ── View Client Modal ───────────────────────────── */}
      {viewClient && (
        <Modal isOpen={!!viewClient} onClose={() => setViewClient(null)} title="Client Details" size="sm">
          <div className="space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500
                to-pink-500 flex items-center justify-center text-white text-xl font-bold">
                {viewClient.first_name?.charAt(0)}{viewClient.last_name?.charAt(0)}
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">
                  {viewClient.first_name} {viewClient.last_name}
                </h3>
                <Badge
                  label={viewClient.is_active ? 'Active' : 'Inactive'}
                  variant={viewClient.is_active ? 'success' : 'danger'}
                />
              </div>
            </div>
            {/* Details */}
            <div className="space-y-3 pt-2">
              {[
                { icon: Mail,     label: 'Email',   value: viewClient.email || 'N/A' },
                { icon: Phone,    label: 'Phone',   value: viewClient.phone },
                { icon: Calendar, label: 'Joined',  value: new Date(viewClient.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 p-3
                  bg-white/5 rounded-xl border border-white/10">
                  <Icon size={15} className="text-white/40 flex-shrink-0" />
                  <div>
                    <p className="text-white/40 text-xs">{label}</p>
                    <p className="text-white text-sm">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* ── Confirm Deactivate Modal ────────────────────── */}
      {confirmDeactivate && (
        <Modal isOpen={!!confirmDeactivate} onClose={() => setConfirmDeactivate(null)} title="Deactivate Client" size="sm">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30
              flex items-center justify-center mx-auto">
              <UserX size={24} className="text-amber-400" />
            </div>
            <div>
              <p className="text-white font-medium">Deactivate this client?</p>
              <p className="text-white/50 text-sm mt-1">
                <span className="text-white font-semibold">
                  {confirmDeactivate.first_name} {confirmDeactivate.last_name}
                </span>{' '}
                will no longer be able to log in.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeactivate(null)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                  rounded-xl py-2.5 text-sm border border-white/20 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => deactivateMutation.mutate(confirmDeactivate.id)}
                disabled={deactivateMutation.isPending}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500
                  hover:from-amber-600 hover:to-orange-600 text-white font-semibold
                  rounded-xl py-2.5 text-sm shadow-lg shadow-amber-500/30
                  transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deactivateMutation.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deactivating...</>
                  : 'Deactivate'
                }
              </button>
            </div>
          </div>
        </Modal>
      )}

    </PageWrapper>
  );
};

export default ClientManagement;