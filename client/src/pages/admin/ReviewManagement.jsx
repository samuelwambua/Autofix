import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Star, Search, Trash2, MessageSquare,
  User, ThumbsUp, TrendingUp, Award,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAllReviewsApi, deleteReviewApi, getReviewSummaryApi,
} from '../../api/reviewApi';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';
import StatCard from '../../components/common/StatCard';

// ─── Star Rating Display ───────────────────────────────────
const StarRating = ({ rating, size = 14 }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        size={size}
        className={star <= rating ? 'text-amber-400 fill-amber-400' : 'text-white/20'}
      />
    ))}
  </div>
);

const getRatingColor = (rating) => {
  if (rating >= 4) return 'text-emerald-400';
  if (rating >= 3) return 'text-amber-400';
  return 'text-red-400';
};

const ReviewManagement = () => {
  const queryClient = useQueryClient();
  const [search, setSearch]             = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [viewReview, setViewReview]     = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // ─── Queries ──────────────────────────────────────────
  const { data, isLoading } = useQuery({ queryKey: ['reviews'],       queryFn: getAllReviewsApi });
  const { data: summaryData } = useQuery({ queryKey: ['reviewSummary'], queryFn: getReviewSummaryApi });

  // ─── Mutations ────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: deleteReviewApi,
    onSuccess: () => {
      toast.success('Review deleted successfully.');
      queryClient.invalidateQueries(['reviews', 'reviewSummary']);
      setConfirmDelete(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete review.'),
  });

  // ─── Filter ───────────────────────────────────────────
  const reviews = data?.data || [];
  const summary = summaryData?.data || {};

  const filtered = reviews.filter((r) => {
    const matchSearch =
      `${r.client_name} ${r.comment} ${r.service_type}`
        .toLowerCase().includes(search.toLowerCase());
    const matchRating = ratingFilter === 'all' || r.rating === parseInt(ratingFilter);
    return matchSearch && matchRating;
  });

  // Rating distribution
  const ratingDist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    pct: reviews.length
      ? Math.round((reviews.filter((r) => r.rating === star).length / reviews.length) * 100)
      : 0,
  }));

  const avgRating = summary.average_rating
    ? parseFloat(summary.average_rating).toFixed(1)
    : reviews.length
      ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
      : '0.0';

  return (
    <PageWrapper title="Reviews" subtitle="Monitor client feedback and service ratings.">

      {/* ── Summary Cards ───────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Reviews"  value={reviews.length}  icon={MessageSquare} color="blue" />
        <StatCard title="Average Rating" value={`${avgRating} / 5`} icon={Star}       color="amber" />
        <StatCard title="5-Star Reviews" value={ratingDist[0].count} icon={Award}     color="emerald" />
        <StatCard title="Response Rate"  value="100%"            icon={ThumbsUp}      color="purple" />
      </div>

      {/* ── Rating Distribution ─────────────────────────── */}
      {reviews.length > 0 && (
        <GlassCard className="p-5 mb-6">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4">
            Rating Distribution
          </p>
          <div className="space-y-2">
            {ratingDist.map(({ star, count, pct }) => (
              <div key={star} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-16 flex-shrink-0">
                  <span className="text-white/60 text-xs">{star}</span>
                  <Star size={11} className="text-amber-400 fill-amber-400" />
                </div>
                <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-white/40 text-xs w-10 text-right">{count}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* ── Top Bar ────────────────────────────────────── */}
      <GlassCard className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search reviews..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl
                  pl-9 pr-4 py-2 text-white placeholder-white/30 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-xl px-4 py-2
                text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="all" className="bg-slate-800">All Ratings</option>
              {[5, 4, 3, 2, 1].map((s) => (
                <option key={s} value={s} className="bg-slate-800">{s} Star{s !== 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>
        </div>
      </GlassCard>

      {/* ── Reviews Grid ────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="md" text="Loading reviews..." />
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center py-16 gap-2">
          <MessageSquare size={36} className="text-white/20" />
          <p className="text-white/40 text-sm">No reviews found.</p>
          <p className="text-white/25 text-xs">Reviews will appear here once clients submit them.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((review) => (
            <GlassCard
              key={review.id}
              className="p-5 cursor-pointer hover:bg-white/15 transition-all duration-200"
              onClick={() => setViewReview(review)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/30
                    to-indigo-500/30 border border-blue-500/20 flex items-center
                    justify-center text-sm font-bold text-blue-300 flex-shrink-0">
                    {review.client_name?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{review.client_name}</p>
                    <p className="text-white/40 text-xs">
                      {new Date(review.created_at).toLocaleDateString('en-KE')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(review); }}
                  className="p-1.5 rounded-lg text-white/20 hover:text-red-400
                    hover:bg-red-500/10 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-3">
                <StarRating rating={review.rating} />
                <span className={`text-sm font-bold ${getRatingColor(review.rating)}`}>
                  {review.rating}/5
                </span>
              </div>

              {/* Comment */}
              {review.comment ? (
                <p className="text-white/60 text-sm line-clamp-3 leading-relaxed">
                  "{review.comment}"
                </p>
              ) : (
                <p className="text-white/25 text-sm italic">No comment provided.</p>
              )}

              {/* Service type */}
              {review.service_type && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <span className="text-xs text-white/40 bg-white/5 border border-white/10
                    rounded-lg px-2 py-1">
                    {review.service_type}
                  </span>
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}

      {/* ── View Review Modal ───────────────────────────── */}
      {viewReview && (
        <Modal isOpen={!!viewReview} onClose={() => setViewReview(null)} title="Review Details" size="sm">
          <div className="space-y-4">
            {/* Client info */}
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/30
                to-indigo-500/30 border border-blue-500/20 flex items-center
                justify-center text-sm font-bold text-blue-300">
                {viewReview.client_name?.charAt(0) || 'C'}
              </div>
              <div>
                <p className="text-white font-semibold">{viewReview.client_name}</p>
                <p className="text-white/40 text-xs">
                  {new Date(viewReview.created_at).toLocaleDateString('en-KE', {
                    year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
              <StarRating rating={viewReview.rating} size={18} />
              <span className={`text-xl font-bold ${getRatingColor(viewReview.rating)}`}>
                {viewReview.rating} / 5
              </span>
            </div>

            {/* Comment */}
            {viewReview.comment && (
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/40 text-xs mb-1">Comment</p>
                <p className="text-white text-sm leading-relaxed">"{viewReview.comment}"</p>
              </div>
            )}

            {/* Service type */}
            {viewReview.service_type && (
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/40 text-xs mb-1">Service Type</p>
                <p className="text-white text-sm">{viewReview.service_type}</p>
              </div>
            )}

            {/* Delete button */}
            <button
              onClick={() => { setViewReview(null); setConfirmDelete(viewReview); }}
              className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20
                text-red-400 font-semibold rounded-xl py-2.5 text-sm
                flex items-center justify-center gap-2 transition-all">
              <Trash2 size={15} /> Delete Review
            </button>
          </div>
        </Modal>
      )}

      {/* ── Confirm Delete Modal ────────────────────────── */}
      {confirmDelete && (
        <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Review" size="sm">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30
              flex items-center justify-center mx-auto">
              <Trash2 size={24} className="text-red-400" />
            </div>
            <div>
              <p className="text-white font-medium">Delete this review?</p>
              <p className="text-white/50 text-sm mt-1">
                Review by <span className="text-white font-semibold">{confirmDelete.client_name}</span> will be permanently removed.
              </p>
            </div>
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

export default ReviewManagement;