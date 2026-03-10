import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Users, Plus, Search, Eye, Trash2,
  ToggleLeft, ToggleRight, Mail, Phone,
  Briefcase, Shield, X, User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAllStaffApi, createStaffApi,
  toggleStaffStatusApi, deleteStaffApi,
} from '../../api/staffApi';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';

// ─── Helpers ──────────────────────────────────────────────
const getRoleBadge = (role) => {
  const map = {
    admin:        { variant: 'danger',  label: 'Admin' },
    supervisor:   { variant: 'purple',  label: 'Supervisor' },
    mechanic:     { variant: 'success', label: 'Mechanic' },
    receptionist: { variant: 'info',    label: 'Receptionist' },
  };
  return map[role] || { variant: 'neutral', label: role };
};

// ─── Create Staff Schema ───────────────────────────────────
const createSchema = z.object({
  first_name:     z.string().min(2, 'First name must be at least 2 characters.'),
  last_name:      z.string().min(2, 'Last name must be at least 2 characters.'),
  email:          z.string().email('Please enter a valid email address.'),
  phone:          z.string().regex(/^(\+254|0)[17]\d{8}$/, 'Enter a valid Kenyan phone number.'),
  password:       z.string().min(6, 'Password must be at least 6 characters.'),
  role:           z.enum(['admin', 'supervisor', 'mechanic', 'receptionist'], { required_error: 'Please select a role.' }),
  specialization: z.string().optional(),
});

// ─── Field component ───────────────────────────────────────
const Field = ({ label, error, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-white/70 text-sm font-medium">{label}</label>
    {children}
    {error && <p className="text-red-400 text-xs">{error}</p>}
  </div>
);

const inputClass = (hasError) =>
  `w-full bg-white/10 border rounded-xl px-4 py-2.5 text-white
   placeholder-white/30 text-sm focus:outline-none focus:ring-2
   focus:ring-blue-500/50 transition-all duration-200
   ${hasError ? 'border-red-400/50' : 'border-white/20'}`;

const StaffManagement = () => {
  const queryClient = useQueryClient();
  const [search, setSearch]           = useState('');
  const [roleFilter, setRoleFilter]   = useState('all');
  const [showCreate, setShowCreate]   = useState(false);
  const [viewStaff, setViewStaff]     = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // ─── Queries ─────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: getAllStaffApi,
  });

  // ─── Mutations ────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: createStaffApi,
    onSuccess: () => {
      toast.success('Staff member created successfully.');
      queryClient.invalidateQueries(['staff']);
      setShowCreate(false);
      reset();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create staff.'),
  });

  const toggleMutation = useMutation({
    mutationFn: toggleStaffStatusApi,
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries(['staff']);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update status.'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStaffApi,
    onSuccess: () => {
      toast.success('Staff member deleted successfully.');
      queryClient.invalidateQueries(['staff']);
      setConfirmDelete(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete staff.'),
  });

  // ─── Form ─────────────────────────────────────────────
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(createSchema),
  });
  const selectedRole = watch('role');

  const onSubmit = (data) => createMutation.mutate(data);

  // ─── Filter staff ─────────────────────────────────────
  const staff = data?.data || [];
  const filtered = staff.filter((s) => {
    const matchSearch =
      `${s.first_name} ${s.last_name} ${s.email} ${s.phone}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || s.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <PageWrapper title="Staff Management" subtitle="Manage your garage team members.">

      {/* ── Top Bar ────────────────────────────────────── */}
      <GlassCard className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl
                  pl-9 pr-4 py-2 text-white placeholder-white/30 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            {/* Role filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-xl px-4 py-2
                text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="all" className="bg-slate-800">All Roles</option>
              <option value="admin" className="bg-slate-800">Admin</option>
              <option value="supervisor" className="bg-slate-800">Supervisor</option>
              <option value="mechanic" className="bg-slate-800">Mechanic</option>
              <option value="receptionist" className="bg-slate-800">Receptionist</option>
            </select>
          </div>
          {/* Add button */}
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500
              hover:from-blue-600 hover:to-indigo-600 text-white font-semibold
              rounded-xl px-4 py-2 text-sm shadow-lg shadow-blue-500/30
              transition-all duration-200 whitespace-nowrap"
          >
            <Plus size={16} /> Add Staff
          </button>
        </div>
      </GlassCard>

      {/* ── Staff Table ─────────────────────────────────── */}
      <GlassCard className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="md" text="Loading staff..." />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Users size={36} className="text-white/20" />
            <p className="text-white/40 text-sm">No staff members found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {['Staff Member', 'Contact', 'Role', 'Specialization', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-white/50 text-xs font-semibold
                      uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((s) => {
                  const badge = getRoleBadge(s.role);
                  return (
                    <tr key={s.id} className="hover:bg-white/5 transition-colors">
                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br
                            from-blue-500 to-indigo-500 flex items-center justify-center
                            text-white text-xs font-bold flex-shrink-0">
                            {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">
                              {s.first_name} {s.last_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      {/* Contact */}
                      <td className="px-4 py-3">
                        <p className="text-white/70 text-xs">{s.email}</p>
                        <p className="text-white/40 text-xs">{s.phone}</p>
                      </td>
                      {/* Role */}
                      <td className="px-4 py-3">
                        <Badge label={badge.label} variant={badge.variant} />
                      </td>
                      {/* Specialization */}
                      <td className="px-4 py-3">
                        <p className="text-white/60 text-xs">{s.specialization || '—'}</p>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <Badge
                          label={s.is_active ? 'Active' : 'Inactive'}
                          variant={s.is_active ? 'success' : 'danger'}
                        />
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setViewStaff(s)}
                            className="p-1.5 rounded-lg text-white/40 hover:text-blue-400
                              hover:bg-blue-500/10 transition-all"
                            title="View"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => toggleMutation.mutate(s.id)}
                            className="p-1.5 rounded-lg text-white/40 hover:text-amber-400
                              hover:bg-amber-500/10 transition-all"
                            title={s.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {s.is_active
                              ? <ToggleRight size={15} />
                              : <ToggleLeft size={15} />
                            }
                          </button>
                          <button
                            onClick={() => setConfirmDelete(s)}
                            className="p-1.5 rounded-lg text-white/40 hover:text-red-400
                              hover:bg-red-500/10 transition-all"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* ── Create Staff Modal ──────────────────────────── */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); reset(); }} title="Add Staff Member" size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name" error={errors.first_name?.message}>
              <input type="text" placeholder="John" {...register('first_name')} className={inputClass(!!errors.first_name)} />
            </Field>
            <Field label="Last Name" error={errors.last_name?.message}>
              <input type="text" placeholder="Doe" {...register('last_name')} className={inputClass(!!errors.last_name)} />
            </Field>
          </div>
          <Field label="Email Address" error={errors.email?.message}>
            <input type="email" placeholder="john@autofix.com" {...register('email')} className={inputClass(!!errors.email)} />
          </Field>
          <Field label="Phone Number" error={errors.phone?.message}>
            <input type="tel" placeholder="0712 345 678" {...register('phone')} className={inputClass(!!errors.phone)} />
          </Field>
          <Field label="Role" error={errors.role?.message}>
            <select {...register('role')} className={inputClass(!!errors.role)}>
              <option value="" className="bg-slate-800">Select role...</option>
              <option value="admin" className="bg-slate-800">Admin</option>
              <option value="supervisor" className="bg-slate-800">Supervisor</option>
              <option value="mechanic" className="bg-slate-800">Mechanic</option>
              <option value="receptionist" className="bg-slate-800">Receptionist</option>
            </select>
          </Field>
          {selectedRole === 'mechanic' && (
            <Field label="Specialization" error={errors.specialization?.message}>
              <input type="text" placeholder="e.g. Engine & Transmission Repair" {...register('specialization')} className={inputClass(!!errors.specialization)} />
            </Field>
          )}
          <Field label="Password" error={errors.password?.message}>
            <input type="password" placeholder="••••••••" {...register('password')} className={inputClass(!!errors.password)} />
          </Field>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setShowCreate(false); reset(); }}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                rounded-xl py-2.5 text-sm border border-white/20 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={createMutation.isPending}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500
                hover:from-blue-600 hover:to-indigo-600 text-white font-semibold
                rounded-xl py-2.5 text-sm shadow-lg shadow-blue-500/30
                transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {createMutation.isPending
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</>
                : 'Create Staff'
              }
            </button>
          </div>
        </form>
      </Modal>

      {/* ── View Staff Modal ────────────────────────────── */}
      {viewStaff && (
        <Modal isOpen={!!viewStaff} onClose={() => setViewStaff(null)} title="Staff Details" size="sm">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500
                to-indigo-500 flex items-center justify-center text-white text-xl font-bold">
                {viewStaff.first_name?.charAt(0)}{viewStaff.last_name?.charAt(0)}
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">
                  {viewStaff.first_name} {viewStaff.last_name}
                </h3>
                <Badge label={getRoleBadge(viewStaff.role).label} variant={getRoleBadge(viewStaff.role).variant} />
              </div>
            </div>
            <div className="space-y-3 pt-2">
              {[
                { icon: Mail,     label: 'Email',          value: viewStaff.email },
                { icon: Phone,    label: 'Phone',          value: viewStaff.phone },
                { icon: Briefcase,label: 'Specialization', value: viewStaff.specialization || 'N/A' },
                { icon: Shield,   label: 'Status',         value: viewStaff.is_active ? 'Active' : 'Inactive' },
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

      {/* ── Confirm Delete Modal ────────────────────────── */}
      {confirmDelete && (
        <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Staff Member" size="sm">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30
              flex items-center justify-center mx-auto">
              <Trash2 size={24} className="text-red-400" />
            </div>
            <div>
              <p className="text-white font-medium">Are you sure?</p>
              <p className="text-white/50 text-sm mt-1">
                You are about to delete <span className="text-white font-semibold">
                  {confirmDelete.first_name} {confirmDelete.last_name}
                </span>. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                  rounded-xl py-2.5 text-sm border border-white/20 transition-all">
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(confirmDelete.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-gradient-to-r from-red-500 to-rose-500
                  hover:from-red-600 hover:to-rose-600 text-white font-semibold
                  rounded-xl py-2.5 text-sm shadow-lg shadow-red-500/30
                  transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {deleteMutation.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting...</>
                  : 'Delete'
                }
              </button>
            </div>
          </div>
        </Modal>
      )}

    </PageWrapper>
  );
};

export default StaffManagement;