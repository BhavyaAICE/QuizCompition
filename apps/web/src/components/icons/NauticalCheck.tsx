import React from 'react';

interface NauticalCheckProps {
  className?: string;
  size?: number | string;
  color?: string;
}

export const NauticalCheck: React.FC<NauticalCheckProps> = ({
  className = "w-6 h-6",
}) => {
  const filterId = React.useId().replace(/:/g, '_');
  const gradId = React.useId().replace(/:/g, '_');

  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="15%" y1="15%" x2="85%" y2="85%">
          <stop offset="0%" stopColor="#FFF9E0" />
          <stop offset="35%" stopColor="#F5D78E" />
          <stop offset="70%" stopColor="#D4A749" />
          <stop offset="100%" stopColor="#8D6325" />
        </linearGradient>
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.85" />
          <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#E5C378" floodOpacity="0.75" />
        </filter>
      </defs>

      {/* Outer brass rivet medallion ring */}
      <circle
        cx="50"
        cy="50"
        r="44"
        stroke={`url(#${gradId})`}
        strokeWidth="3.5"
        fill="rgba(24, 12, 8, 0.85)"
      />

      {/* Decorative dashed nautical orbit */}
      <circle
        cx="50"
        cy="50"
        r="36"
        stroke="#B08A45"
        strokeWidth="1.2"
        strokeDasharray="4 3"
        opacity="0.8"
        fill="transparent"
      />

      {/* Four cardinal nautical notches */}
      <line x1="50" y1="8" x2="50" y2="15" stroke={`url(#${gradId})`} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="85" x2="50" y2="92" stroke={`url(#${gradId})`} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="8" y1="50" x2="15" y2="50" stroke={`url(#${gradId})`} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="85" y1="50" x2="92" y2="50" stroke={`url(#${gradId})`} strokeWidth="2.5" strokeLinecap="round" />

      {/* Corner rivet dots at 45 degree angles */}
      <circle cx="24" cy="24" r="2" fill="#E5C378" opacity="0.9" />
      <circle cx="76" cy="24" r="2" fill="#E5C378" opacity="0.9" />
      <circle cx="24" cy="76" r="2" fill="#E5C378" opacity="0.9" />
      <circle cx="76" cy="76" r="2" fill="#E5C378" opacity="0.9" />

      {/* Confident, chiseled calligraphic checkmark */}
      <path
        d="M29 51 L44 67 L72 33"
        stroke={`url(#${gradId})`}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${filterId})`}
      />
    </svg>
  );
};
