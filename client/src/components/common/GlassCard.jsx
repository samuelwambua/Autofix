const GlassCard = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl ${onClick ? 'cursor-pointer hover:bg-white/15 transition-all duration-200' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

export default GlassCard;