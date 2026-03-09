const Badge = ({ label, variant = 'neutral', className = '' }) => {
  const variants = {
    success: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    warning: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    danger:  'bg-red-500/20 text-red-300 border border-red-500/30',
    info:    'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    neutral: 'bg-white/10 text-white/60 border border-white/20',
    purple:  'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
    >
      {label}
    </span>
  );
};

export default Badge;