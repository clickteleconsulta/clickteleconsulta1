import React from 'react';

// Marca do Click Teleconsulta — SVG inline (sem dependência de CDN externo,
// que antes quebrava o logo quando o Horizons CDN saiu do ar).
const Logo = ({ className = 'w-10 h-10' }) => (
  <svg
    viewBox="0 0 48 48"
    className={className}
    role="img"
    aria-label="Click Teleconsulta"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="ctLogoGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#0ea5e9" />
        <stop offset="100%" stopColor="#14b8a6" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#ctLogoGrad)" />
    {/* pulso / batimento — leitura de telemedicina */}
    <path
      d="M9 26h6l3-9 4 15 3-8 2 4h9"
      fill="none"
      stroke="#ffffff"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default Logo;
