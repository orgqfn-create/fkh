import React from 'react';
import { useStore } from '../context/StoreContext';

export const ToastNotification: React.FC = () => {
  const { toast } = useStore();

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-full bg-surface-container-highest/95 backdrop-blur-md shadow-2xl border border-primary/20 flex items-center gap-2 pointer-events-none transition-all duration-200"
    >
      <span className="material-symbols-outlined text-primary text-[18px]">
        {toast.icon}
      </span>
      <span className="text-xs font-semibold text-on-surface whitespace-nowrap">
        {toast.message}
      </span>
    </div>
  );
};
