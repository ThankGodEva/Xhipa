import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'whatsapp' | 'white' | 'white-outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 shadow-sm shadow-blue-600/20',
    secondary: 'bg-slate-900 hover:bg-slate-800 text-white focus:ring-slate-700',
    outline: 'border border-slate-200 hover:bg-slate-50 text-slate-700 focus:ring-slate-400 bg-white',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500 shadow-sm shadow-rose-600/20',
    ghost: 'hover:bg-slate-100 text-slate-700 focus:ring-slate-300',
    whatsapp: 'bg-emerald-600 hover:bg-emerald-500 text-white focus:ring-emerald-500 shadow-sm shadow-emerald-600/20 font-semibold',
    white: 'bg-white hover:bg-blue-50 text-blue-600 hover:text-blue-700 focus:ring-white shadow-sm font-semibold',
    'white-outline': 'bg-white/10 hover:bg-white/20 text-white border border-white/25 focus:ring-white/50 backdrop-blur-xs font-medium',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
