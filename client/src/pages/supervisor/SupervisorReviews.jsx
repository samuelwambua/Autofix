import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, MessageSquare } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import PageWrapper from '../../components/layout/PageWrapper';
import GlassCard from '../../components/common/GlassCard';
import Spinner from '../../components/common/Spinner';
import StatCard from '../../components/common/StatCard';

const fetchMyReviews = () => axiosInstance.get('/supervisor/reviews').then(r => r.data);

const StarDisplay = ({ rating }) => (
  <div className="flex items-center gap-0.5">
    {[1,2,3,4,5].map(s => (
      <Star key={s} size={14} className={s <= rating ? 'text-amber-400 fill-amber-400' : 'text-white/20'} />
    ))}
  </div>
);

const SupervisorReviews = () => {
  const { data, isLoading } = useQuery({ queryKey: ['supervisorReviews'], queryFn: fetchMyReviews });

  const reviews = data?.data || [];
  const summary = data?.summary || {};
  const avg     = parseFloat(summary.average_rating || 0);

  const ratingBars = [
    { stars: 5, count: parseInt(summary.five_star  || 0) },
    { stars: 4, count: parseInt(summary.four_star  || 0) },
    { stars: 3, count: parseInt(summary.three_star || 0) },
    { stars: 2, count: parseInt(summary.two_star   || 0) },
    { stars: 1, count: parseInt(summary.one_star   || 0) },
  ];
  const totalReviews = parseInt(summary.total_reviews || 0);

  return (
    <PageWrapper title="Reviews" subtitle="Client feedback for your team's services.">

      {/* ── Summary ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <GlassCard className="p-5">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4">Overall Rating</p>
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold text-white">{avg || '—'}</div>
            <div>
              <StarDisplay rating={Math.round(avg)} />
              <p className="text-white/40 text-xs mt-1">{totalReviews} review{totalReviews !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4">Rating Breakdown</p>
          <div className="space-y-2">
            {ratingBars.map(({ stars, count }) => (
              <div key={stars} className="flex items-center gap-3">
                <span className="text-white/40 text-xs w-4">{stars}</span>
                <Star size={11} className="text-amber-400 fill-amber-400 flex-shrink-0" />
                <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full transition-all"
                    style={{ width: totalReviews > 0 ? `${(count / totalReviews) * 100}%` : '0%' }} />
                </div>
                <span className="text-white/40 text-xs w-4 text-right">{count}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* ── Reviews List ─────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Spinner size="md" text="Loading reviews..." /></div>
      ) : reviews.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center py-16 gap-3">
          <MessageSquare size={36} className="text-white/20" />
          <p className="text-white/40 text-sm">No reviews yet.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((r) => (
            <GlassCard key={r.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-white font-semibold text-sm">{r.client_name}</p>
                  <p className="text-white/40 text-xs">{r.vehicle_name} • {r.plate_number}</p>
                </div>
                <StarDisplay rating={r.rating} />
              </div>
              {r.comment ? (
                <p className="text-white/60 text-sm leading-relaxed">"{r.comment}"</p>
              ) : (
                <p className="text-white/25 text-sm italic">No comment provided.</p>
              )}
              <div className="flex items-center justify-between mt-3">
                <p className="text-white/25 text-xs">{r.mechanic_name ? `Mechanic: ${r.mechanic_name}` : ''}</p>
                <p className="text-white/25 text-xs">{new Date(r.created_at).toLocaleDateString('en-KE')}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </PageWrapper>
  );
};

export default SupervisorReviews;