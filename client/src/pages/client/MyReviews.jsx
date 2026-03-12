import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Star, Plus, Trash2, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axiosInstance';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';

const fetchMyReviews = async () => {
  const res = await axiosInstance.get('/reviews/my-reviews');
  return res.data;
};
const fetchMyInvoices = async () => {
  const res = await axiosInstance.get('/invoices/my-invoices');
  return res.data;
};

const reviewSchema = z.object({
  invoice_id: z.string().min(1, 'Please select a service.'),
  rating:     z.coerce.number().min(1).max(5),
  comment:    z.string().optional(),
});

const StarPicker = ({ value, onChange }) => (
  <div className="flex items-center gap-2">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        onClick={() => onChange(star)}
        className="transition-transform hover:scale-110"
      >
        <Star
          size={28}
          className={star <= value
            ? 'text-amber-400 fill-amber-400'
            : 'text-white/20 hover:text-amber-300'
          }
        />
      </button>
    ))}
    <span className="text-white/50 text-sm ml-2">{value}/5</span>
  </div>
);

const StarDisplay = ({ rating }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        size={14}
        className={star <= rating ? 'text-amber-400 fill-amber-400' : 'text-white/20'}
      />
    ))}
  </div>
);

const inputClass = (hasError) =>
  `w-full bg-white/10 border rounded-xl px-4 py-2.5 text-white
   placeholder-white/30 text-sm focus:outline-none focus:ring-2
   focus:ring-blue-500/50 transition-all duration-200
   ${hasError ? 'border-red-400/50' : 'border-white/20'}`;

const MyReviews = () => {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [starValue, setStarValue]     = useState(5);

  const { data, isLoading } = useQuery({ queryKey: ['myReviews'],  queryFn: fetchMyReviews });
  const { data: invoicesData } = useQuery({ queryKey: ['myInvoices'], queryFn: fetchMyInvoices });

  const createMutation = useMutation({
    mutationFn: (data) => axiosInstance.post('/reviews', data).then(r => r.data),
    onSuccess: () => {
      toast.success('Review submitted successfully.');
      queryClient.invalidateQueries(['myReviews']);
      setShowCreate(false); reset(); setStarValue(5);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to submit review.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/reviews/${id}`).then(r => r.data),
    onSuccess: () => {
      toast.success('Review deleted.');
      queryClient.invalidateQueries(['myReviews']);
      setConfirmDelete(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete review.'),
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 5 },
  });

  const handleStarChange = (val) => {
    setStarValue(val);
    setValue('rating', val);
  };

  const onSubmit = (data) => createMutation.mutate(data);

  const reviews  = data?.data || [];
  const invoices = invoicesData?.data || [];
  // Only paid invoices can be reviewed
  const reviewableInvoices = invoices.filter(i => i.status === 'paid');

  return (
    <PageWrapper title="My Reviews" subtitle="Share your feedback on our services.">

      {/* ── Top Bar ──────────────────────────────────────── */}
      <GlassCard className="p-4 mb-6">
        <div className="flex items-center justify-between">
          <p className="text-white/50 text-sm">
            {reviews.length} review{reviews.length !== 1 ? 's' : ''} submitted
          </p>
          <button
            onClick={() => { setShowCreate(true); reset(); setStarValue(5); }}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500
              hover:from-amber-600 hover:to-orange-600 text-white font-semibold
              rounded-xl px-4 py-2 text-sm shadow-lg shadow-amber-500/30
              transition-all whitespace-nowrap"
          >
            <Plus size={16} /> Write a Review
          </button>
        </div>
      </GlassCard>

      {/* ── Reviews List ─────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="md" text="Loading reviews..." />
        </div>
      ) : reviews.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center py-16 gap-3">
          <MessageSquare size={36} className="text-white/20" />
          <p className="text-white/40 text-sm">No reviews yet.</p>
          <p className="text-white/25 text-xs">Share your experience with our services.</p>
          <button
            onClick={() => { setShowCreate(true); reset(); setStarValue(5); }}
            className="flex items-center gap-2 bg-amber-500/20 hover:bg-amber-500/30
              text-amber-300 text-xs font-semibold rounded-xl px-4 py-2 transition-all"
          >
            <Star size={13} /> Write your first review
          </button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((r) => (
            <GlassCard key={r.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <StarDisplay rating={r.rating} />
                <button
                  onClick={() => setConfirmDelete(r)}
                  className="p-1.5 rounded-lg text-white/20 hover:text-red-400
                    hover:bg-red-500/10 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {r.comment ? (
                <p className="text-white/60 text-sm leading-relaxed">"{r.comment}"</p>
              ) : (
                <p className="text-white/25 text-sm italic">No comment provided.</p>
              )}
              <p className="text-white/25 text-xs mt-3">
                {new Date(r.created_at).toLocaleDateString('en-KE', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}
              </p>
            </GlassCard>
          ))}
        </div>
      )}

      {/* ── Create Review Modal ──────────────────────────── */}
      <Modal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); reset(); setStarValue(5); }}
        title="Write a Review"
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-white/70 text-sm font-medium">Select Service</label>
            <select {...register('invoice_id')} className={inputClass(!!errors.invoice_id)}>
              <option value="" className="bg-slate-800">Select a completed service...</option>
              {reviewableInvoices.map((inv) => (
                <option key={inv.id} value={inv.id} className="bg-slate-800">
                  {inv.job_description} — {inv.vehicle_name}
                </option>
              ))}
            </select>
            {errors.invoice_id && <p className="text-red-400 text-xs">{errors.invoice_id.message}</p>}
            {reviewableInvoices.length === 0 && (
              <p className="text-white/30 text-xs mt-1">
                No paid services available to review yet.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-white/70 text-sm font-medium">Your Rating</label>
            <input type="hidden" {...register('rating')} />
            <StarPicker value={starValue} onChange={handleStarChange} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-white/70 text-sm font-medium">Comment (optional)</label>
            <textarea
              rows={3}
              placeholder="Tell us about your experience..."
              {...register('comment')}
              className={`${inputClass(false)} resize-none`}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button"
              onClick={() => { setShowCreate(false); reset(); setStarValue(5); }}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                rounded-xl py-2.5 text-sm border border-white/20 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={createMutation.isPending}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500
                text-white font-semibold rounded-xl py-2.5 text-sm
                transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {createMutation.isPending
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
                : 'Submit Review'
              }
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Confirm Delete Modal ─────────────────────────── */}
      {confirmDelete && (
        <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Review" size="sm">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30
              flex items-center justify-center mx-auto">
              <Trash2 size={24} className="text-red-400" />
            </div>
            <p className="text-white font-medium">Delete this review?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold
                  rounded-xl py-2.5 text-sm border border-white/20 transition-all">
                Cancel
              </button>
              <button onClick={() => deleteMutation.mutate(confirmDelete.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-gradient-to-r from-red-500 to-rose-500
                  text-white font-semibold rounded-xl py-2.5 text-sm
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

export default MyReviews;