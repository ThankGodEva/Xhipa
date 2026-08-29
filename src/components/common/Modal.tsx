import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md'
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="flex min-h-full items-start sm:items-center justify-center p-3.5 sm:p-6 text-center">
        <div
          className={`relative w-full ${maxWidthStyles[maxWidth]} my-auto bg-white rounded-2xl shadow-2xl border border-slate-100 text-left overflow-hidden transform transition-all z-10 my-4 sm:my-8`}
        >
          {(title || description) && (
            <div className="sticky top-0 bg-white/95 backdrop-blur-xs z-20 flex items-start justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <div className="pr-4 min-w-0 flex-1">
                {title && <h3 className="text-lg font-bold text-slate-900">{title}</h3>}
                {description && <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed">{description}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition shrink-0"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
          <div className="p-4 sm:p-6">{children}</div>
        </div>
      </div>
    </div>
  );
};
