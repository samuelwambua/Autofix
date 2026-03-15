const StatCard = ({ title, value, icon: Icon, color = 'blue', trend, suffix = '' }) => {
  const colors = {
    blue:    'from-blue-500 to-indigo-500 shadow-blue-500/30',
    emerald: 'from-emerald-500 to-teal-500 shadow-emerald-500/30',
    amber:   'from-amber-500 to-orange-500 shadow-amber-500/30',
    rose:    'from-rose-500 to-pink-500 shadow-rose-500/30',
    purple:  'from-purple-500 to-violet-500 shadow-purple-500/30',
    cyan:    'from-cyan-500 to-blue-500 shadow-cyan-500/30',
  };

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <p className="text-white/60 text-xs sm:text-sm font-medium leading-tight">{title}</p>
        {Icon && (
          <div className={`bg-gradient-to-br ${colors[color]} p-2 sm:p-2.5 rounded-xl shadow-lg flex-shrink-0`}>
            <Icon size={16} className="text-white sm:hidden" />
            <Icon size={18} className="text-white hidden sm:block" />
          </div>
        )}
      </div>
      <div className="flex items-end gap-2">
        <h3 className="text-xl sm:text-3xl font-bold text-white truncate">
          {value}
          {suffix && <span className="text-sm sm:text-lg font-medium text-white/60 ml-1">{suffix}</span>}
        </h3>
      </div>
      {trend && (
        <p className={`text-xs mt-2 ${trend.positive ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend.positive ? '▲' : '▼'} {trend.label}
        </p>
      )}
    </div>
  );
};

export default StatCard;