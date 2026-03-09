const Spinner = ({ size = 'md', text = '' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizes[size]} border-2 border-white/20 border-t-blue-400 rounded-full animate-spin`}
      />
      {text && <p className="text-white/60 text-sm">{text}</p>}
    </div>
  );
};

export default Spinner;