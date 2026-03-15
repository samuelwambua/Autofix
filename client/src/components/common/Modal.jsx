import { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className={`
        relative w-full ${sizes[size]}
        bg-slate-900/95 backdrop-blur-xl
        border border-white/20 shadow-2xl
        rounded-t-2xl sm:rounded-2xl
        max-h-[92vh] sm:max-h-[90vh]
        flex flex-col
        animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <h3 className="text-white font-bold text-base sm:text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/40 hover:text-white
              hover:bg-white/10 transition-all flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;