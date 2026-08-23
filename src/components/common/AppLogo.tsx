import React, { useState } from 'react';
import { Store } from 'lucide-react';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  textColor?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'md',
  className = '',
  showText = true,
  textColor = 'text-slate-900'
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-8 h-8 rounded-xl',
    lg: 'w-9 h-9 rounded-xl',
    xl: 'w-10 h-10 rounded-xl'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base font-bold',
    lg: 'text-xl font-bold',
    xl: 'text-2xl font-bold'
  };

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {!imageError ? (
        <img
          src="/Xhipa.png"
          alt="Xhipa Logo"
          onError={() => setImageError(true)}
          className={`${sizeClasses[size]} object-contain bg-white shadow-2xs border border-slate-200/80 p-0.5`}
        />
      ) : (
        <div className={`${sizeClasses[size]} bg-blue-600 flex items-center justify-center text-white shadow-sm`}>
          <Store className="w-4 h-4" />
        </div>
      )}
      {showText && (
        <span className={`tracking-tight ${textSizes[size]} ${textColor}`}>
          Xhipa
        </span>
      )}
    </div>
  );
};
