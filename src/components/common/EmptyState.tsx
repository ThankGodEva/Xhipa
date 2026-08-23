import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  actionIcon
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
      <div className="p-4 bg-slate-100 rounded-2xl text-slate-500 mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>
      {actionText && onAction && (
        <Button variant="primary" size="md" onClick={onAction} leftIcon={actionIcon}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
