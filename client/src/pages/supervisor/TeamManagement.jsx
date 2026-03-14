import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Users, Plus, Trash2, Search, Eye, Pencil, UserPlus, ToggleLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axiosInstance';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';

const fetchMyTeam     = () => axiosInstance.get('/supervisor/team').then(r => r.data);
const fetchUnassigned = () => axiosInstance.get('/supervisor/team/unassigned').then(r => r.data);

const mechanicSchema = z.object({
  first_name:     z.string().min(1, 'First name is required.'),
  last_name:      z.string().min(1, 'Last name is required.'),
  email:          z.string().email('Invalid email.').optional().or(z.literal('')),
  phone:          z.string().min(10, 'Valid phone number required.'),
  password:       z.string().min(6, 'Password must be at least 6 characters.').optional().or(z.literal('')),
  specialization: z.string().optional(),
});

const inputClass = (err) =>
  `w-full bg-white/10 border rounded-xl px-4 py-2.5 text-white placeholder-white/30
   text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all
   ${err ? 'border-red-400/50' : 'border-white/20'}`;

const Field = ({ label, error, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-white/70 text-sm font-medium">{label}</label>
    {children}
    {error && <p className="text-red-400 text-xs">{error}</p>}
  </div>
);

const TeamManagement = () => {
  const queryClient = useQueryClient();
  const [search, setSearch]             = useState('');
  const [showCreate, setShowCreate]     = useState(false);
  const [showAssign, setShowAssign]     = useState(false);
  const [editMechanic, setEditMechanic] = useState(null);
  const [viewMechanic, setViewMechanic] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data: teamData, isLoading } = useQuery({ queryKey: ['myTeam'], queryFn: fetchMyTeam });
  const { data: unassignedData }      = useQuery({ queryKey: ['unassignedMechanics'], queryFn: fetchUnassigned, enabled: showAssign });

  const createMutation = useMutation({
    mutationFn: (data) => axiosInstance.post('/supervisor/team/create', data).then(r => r.data),
    onSuccess: () => { toast.success('Mechanic created and added to your team.'); queryClient.invalidateQueries(['myTeam', 'supervisorDashboard']); setShowCreate(false); resetCreate(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create mechanic.'),
  });

  const assignMutation = useMutation({
    mutationFn: (mechanic_id) => axiosInstance.post('/supervisor/team/add', { mechanic_id }).then(r => r.data),
    onSuccess: () => { toast.success('Mechanic added to your team.'); queryClient.invalidateQueries(['myTeam', 'unassignedMechanics', 'supervisorDashboard']); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add mechanic.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => axiosInstance.put(`/supervisor/team/${id}`, data).then(r => r.data),
    onSuccess: () => { toast.success('Mechanic updated.'); queryClient.invalidateQueries(['myTeam']); setEditMechanic(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update mechanic.'),
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => axiosInstance.put(`/supervisor/team/${id}/toggle`).then(r => r.data),
    onSuccess: () => { toast.success('Status updated.'); queryClient.invalidateQueries(['myTeam']); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update status.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/supervisor/team/${id}`).then(r => r.data),
    onSuccess: () => { toast.success('Mechanic deleted.'); queryClient.invalidateQueries(['myTeam', 'supervisorDashboard']); setConfirmDelete(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete mechanic.'),
  });

  const removeMutation = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/supervisor/team/${id}/remove`).then(r => r.data),
    onSuccess: () => { toast.success('Mechanic removed from team.'); queryClient.invalidateQueries(['myTeam', 'unassignedMechanics', 'supervisorDashboard']); setConfirmDelete(null); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to remove mechanic.'),
  });

  const { register: regCreate, handleSubmit: handleCreate, reset: resetCreate, formState: { errors: errCreate } } = useForm({ resolver: zodResolver(mechanicSchema) });
  const { register: regEdit,   handleSubmit: handleEdit,   reset: resetEdit,   formState: { errors: errEdit   } } = useForm({ resolver: zodResolver(mechanicSchema) });

  const team       = teamData?.data || [];
  const unassigned = unassignedData?.data || [];
  const filtered   = team.filter(m =>
    `${m.first_name} ${m.last_name} ${m.specialization} ${m.phone}`
      .toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (m) => {
    setEditMechanic(m);
    resetEdit({ first_name: m.first_name, last_name: m.last_name, email: m.email || '', phone: m.phone, specialization: m.specialization || '' });
  };

  return (
    <PageWrapper title="My Team" subtitle="Create, manage and assign mechanics to your team.">

      {/* ── Top Bar ────────────────────────────────────── */}
      <GlassCard className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input type="text" placeholder="Search team..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl pl-9 pr-4 py-2
                text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAssign(true)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold
                rounded-xl px-4 py-2 text-sm border border-white/20 transition-all whitespace-nowrap">
              <UserPlus size={15} /> Add Existing
            </button>
            <button onClick={() => { setShowCreate(true); resetCreate(); }}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500
                hover:from-blue-600 hover:to-indigo-600 text-white font-semibold
                rounded-xl px-4 py-2 text-sm shadow-lg shadow-blue-500/30 transition-all whitespace-nowrap">
              <Plus size={15} /> New Mechanic
            </button>
          </div>
        </div>
      </GlassCard>

      {/* ── Team Grid ──────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Spinner size="md" text="Loading team..." /></div>
      ) : filtered.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center py-16 gap-3">
          <Users size={36} className="text-white/20" />
          <p className="text-white/40 text-sm">{team.length === 0 ? 'No mechanics on your team yet.' : 'No results found.'}</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <GlassCard key={m.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/30
                    flex items-center justify-center text-emerald-400 font-bold flex-shrink-0">
                    {m.first_name.charAt(0)}{m.last_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{m.first_name} {m.last_name}</p>
                    <p className="text-white/40 text-xs">{m.specialization || 'General Mechanic'}</p>
                  </div>
                </div>
                <Badge label={m.is_active ? 'Active' : 'Inactive'} variant={m.is_active ? 'success' : 'danger'} />
              </div>
              <div className="space-y-1.5 mb-4">
                {[
                  { label: 'Phone', value: m.phone },
                  { label: 'Email', value: m.email || '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center p-2
                    bg-white/5 rounded-xl border border-white/10 text-xs">
                    <span className="text-white/40">{label}</span>
                    <span className="text-white truncate ml-2">{value}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <button onClick={() => setViewMechanic(m)}
                  className="flex items-center justify-center p-2 rounded-xl
                    bg-white/10 hover:bg-white/20 text-white/60 hover:text-white
                    border border-white/20 transition-all" title="View">
                  <Eye size={14} />
                </button>
                <button onClick={() => openEdit(m)}
                  className="flex items-center justify-center p-2 rounded-xl
                    bg-blue-500/10 hover:bg-blue-500/20 text-blue-400
                    border border-blue-500/20 transition-all" title="Edit">
                  <Pencil size={14} />
                </button>
                <button onClick={() => toggleMutation.mutate(m.id)}
                  className="flex items-center justify-center p-2 rounded-xl
                    bg-amber-500/10 hover:bg-amber-500/20 text-amber-400
                    border border-amber-500/20 transition-all" title="Toggle status">
                  <ToggleLeft size={14} />
                </button>
                <button onClick={() => setConfirmDelete(m)}
                  className="flex items-center justify-center p-2 rounded-xl
                    bg-red-500/10 hover:bg-red-500/20 text-red-400
                    border border-red-500/20 transition-all" title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* ── Create Mechanic Modal ──────────────────────── */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); resetCreate(); }} title="Create New Mechanic" size="md">
        <form onSubmit={handleCreate((d) => createMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name" error={errCreate.first_name?.message}>
              <input {...regCreate('first_name')} placeholder="John" className={inputClass(errCreate.first_name)} />
            </Field>
            <Field label="Last Name" error={errCreate.last_name?.message}>
              <input {...regCreate('last_name')} placeholder="Doe" className={inputClass(errCreate.last_name)} />
            </Field>
          </div>
          <Field label="Phone" error={errCreate.phone?.message}>
            <input {...regCreate('phone')} placeholder="07XXXXXXXX" className={inputClass(errCreate.phone)} />
          </Field>
          <Field label="Email (optional)" error={errCreate.email?.message}>
            <input {...regCreate('email')} type="email" placeholder="mechanic@email.com" className={inputClass(errCreate.email)} />
          </Field>
          <Field label="Specialization (optional)" error={errCreate.specialization?.message}>
            <input {...regCreate('specialization')} placeholder="e.g. Engine & Transmission" className={inputClass(false)} />
          </Field>
          <Field label="Password" error={errCreate.password?.message}>
            <input {...regCreate('password')} type="password" placeholder="Min. 6 characters" className={inputClass(errCreate.password)} />
          </Field>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowCreate(false); resetCreate(); }}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl py-2.5 text-sm border border-white/20 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={createMutation.isPending}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold
                rounded-xl py-2.5 text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {createMutation.isPending ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...</> : 'Create Mechanic'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Assign Existing Modal ──────────────────────── */}
      <Modal isOpen={showAssign} onClose={() => setShowAssign(false)} title="Add Existing Mechanic" size="md">
        <div className="space-y-3">
          <p className="text-white/50 text-sm">Select an unassigned mechanic to add to your team.</p>
          {unassigned.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Users size={28} className="text-white/20" />
              <p className="text-white/40 text-sm">No unassigned mechanics available.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {unassigned.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm flex-shrink-0">
                    {m.first_name.charAt(0)}{m.last_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold">{m.first_name} {m.last_name}</p>
                    <p className="text-white/40 text-xs">{m.specialization || 'General Mechanic'}</p>
                  </div>
                  <button onClick={() => assignMutation.mutate(m.id)} disabled={assignMutation.isPending}
                    className="flex items-center gap-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300
                      text-xs font-semibold rounded-xl px-3 py-1.5 border border-blue-500/20 transition-all disabled:opacity-50">
                    <Plus size={12} /> Add
                  </button>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => setShowAssign(false)}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl py-2.5 text-sm border border-white/20 transition-all">
            Close
          </button>
        </div>
      </Modal>

      {/* ── Edit Mechanic Modal ────────────────────────── */}
      {editMechanic && (
        <Modal isOpen={!!editMechanic} onClose={() => setEditMechanic(null)} title="Edit Mechanic" size="md">
          <form onSubmit={handleEdit((d) => updateMutation.mutate({ id: editMechanic.id, data: d }))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name" error={errEdit.first_name?.message}>
                <input {...regEdit('first_name')} className={inputClass(errEdit.first_name)} />
              </Field>
              <Field label="Last Name" error={errEdit.last_name?.message}>
                <input {...regEdit('last_name')} className={inputClass(errEdit.last_name)} />
              </Field>
            </div>
            <Field label="Phone" error={errEdit.phone?.message}>
              <input {...regEdit('phone')} className={inputClass(errEdit.phone)} />
            </Field>
            <Field label="Email" error={errEdit.email?.message}>
              <input {...regEdit('email')} type="email" className={inputClass(errEdit.email)} />
            </Field>
            <Field label="Specialization" error={errEdit.specialization?.message}>
              <input {...regEdit('specialization')} className={inputClass(false)} />
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditMechanic(null)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl py-2.5 text-sm border border-white/20 transition-all">
                Cancel
              </button>
              <button type="submit" disabled={updateMutation.isPending}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold
                  rounded-xl py-2.5 text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {updateMutation.isPending ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</> : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── View Mechanic Modal ────────────────────────── */}
      {viewMechanic && (
        <Modal isOpen={!!viewMechanic} onClose={() => setViewMechanic(null)} title="Mechanic Details" size="sm">
          <div className="space-y-3">
            {[
              { label: 'Name',           value: `${viewMechanic.first_name} ${viewMechanic.last_name}` },
              { label: 'Phone',          value: viewMechanic.phone },
              { label: 'Email',          value: viewMechanic.email || '—' },
              { label: 'Specialization', value: viewMechanic.specialization || 'General Mechanic' },
              { label: 'Status',         value: viewMechanic.is_active ? 'Active' : 'Inactive' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/40 text-sm">{label}</p>
                <p className="text-white text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* ── Confirm Delete Modal ───────────────────────── */}
      {confirmDelete && (
        <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Mechanic" size="sm">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto">
              <Trash2 size={24} className="text-red-400" />
            </div>
            <div>
              <p className="text-white font-medium">Delete this mechanic?</p>
              <p className="text-white/50 text-sm mt-1">{confirmDelete.first_name} {confirmDelete.last_name}</p>
              <p className="text-white/30 text-xs mt-1">This action cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl py-2.5 text-sm border border-white/20 transition-all">
                Cancel
              </button>
              <button onClick={() => deleteMutation.mutate(confirmDelete.id)} disabled={deleteMutation.isPending}
                className="flex-1 bg-gradient-to-r from-red-500 to-rose-500 text-white font-semibold
                  rounded-xl py-2.5 text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {deleteMutation.isPending ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Deleting...</> : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </PageWrapper>
  );
};

export default TeamManagement;