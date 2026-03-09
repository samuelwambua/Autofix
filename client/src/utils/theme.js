export const theme = {
  // Background gradient for all pages
  background: 'min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900',

  // Glassmorphism card
  glass: 'bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl',

  // Stronger glass for sidebar
  glassDark: 'bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl',

  // Active sidebar item gradient
  activeNav: 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/30',

  // Soft neumorphic card (for inner cards)
  softCard: 'bg-white/5 rounded-2xl border border-white/10 shadow-inner',

  // Primary button
  btnPrimary: 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold rounded-xl px-6 py-2.5 shadow-lg shadow-blue-500/30 transition-all duration-200',

  // Secondary button
  btnSecondary: 'bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl px-6 py-2.5 border border-white/20 transition-all duration-200',

  // Input fields
  input: 'w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all duration-200',

  // Text colors
  textPrimary: 'text-white',
  textSecondary: 'text-white/60',
  textMuted: 'text-white/40',

  // Status badge colors
  badge: {
    success: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    warning: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    danger: 'bg-red-500/20 text-red-300 border border-red-500/30',
    info: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    neutral: 'bg-white/10 text-white/60 border border-white/20',
  },
};