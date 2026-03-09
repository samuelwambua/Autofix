const Input = ({
  label,
  error,
  icon: Icon,
  type = 'text',
  placeholder,
  className = '',
  ...rest
}) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-white/70 text-sm font-medium">{label}</label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
            <Icon size={16} />
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          className={`
            w-full bg-white/10 border rounded-xl px-4 py-2.5
            text-white placeholder-white/40
            focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50
            transition-all duration-200
            ${error ? 'border-red-400/50' : 'border-white/20'}
            ${Icon ? 'pl-10' : ''}
            ${className}
          `}
          {...rest}
        />
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
};

export default Input;