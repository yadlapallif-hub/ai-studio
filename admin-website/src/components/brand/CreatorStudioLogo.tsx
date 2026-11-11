import React from "react";

export function CreatorStudioLogo({
  size = 34,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id={`fcs-bg-${uid}`} x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0D3B38" />
          <stop offset="55%" stopColor="#0F766E" />
          <stop offset="100%" stopColor="#115E59" />
        </linearGradient>
        <linearGradient id={`fcs-gold-${uid}`} x1="34" y1="12" x2="54" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="58" height="58" rx="15" fill={`url(#fcs-bg-${uid})`} stroke="#5EEAD4" strokeOpacity="0.35" strokeWidth="1.5" />
      <rect x="9" y="9" width="46" height="46" rx="10" stroke="#99F6E4" strokeOpacity="0.22" strokeWidth="1" strokeDasharray="3 3" />
      <path d="M20 46V19C20 17.8954 20.8954 17 22 17H39" stroke="#FFFFFF" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 31.5H34.5" stroke="#FFFFFF" strokeWidth="4.2" strokeLinecap="round" />
      <circle cx="44.5" cy="19.5" r="5.5" fill={`url(#fcs-gold-${uid})`} />
      <path d="M44.5 15.2V23.8M40.2 19.5H48.8" stroke="#451A03" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M28 45.5H44" stroke="#5EEAD4" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="44" cy="45.5" r="2.1" fill="#FBBF24" />
    </svg>
  );
}
