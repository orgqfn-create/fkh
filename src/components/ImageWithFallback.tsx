import React, { useState } from 'react';

interface ImageWithFallbackProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  fallbackLabel,
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-surface-container-high via-surface-container to-surface-container-lowest text-primary/80 p-3 text-center"
        role="img"
        aria-label={alt}
      >
        <span className="material-symbols-outlined text-[28px] text-primary/70">
          local_fire_department
        </span>
        {fallbackLabel && (
          <span className="text-[11px] font-semibold text-on-surface-variant mt-1 line-clamp-2">
            {fallbackLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
