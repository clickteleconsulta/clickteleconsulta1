import React from 'react';

// Ilustração vetorial própria (flat, azul) para o hero: cena de teleconsulta —
// smartphone com médico em vídeo-chamada + chips flutuantes (pulso, confirmado, agenda).
// Arte autoral. Personagem refinado (rosto/cabelo). Respeita prefers-reduced-motion.
const HeroIllustration = ({ className = '' }) => (
  <svg
    className={className}
    viewBox="0 0 560 520"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Ilustração de teleconsulta: um médico atendendo por vídeo em um smartphone"
  >
    <defs>
      <radialGradient id="ct-blob" cx="50%" cy="45%" r="60%">
        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.55" />
        <stop offset="60%" stopColor="#1d4ed8" stopOpacity="0.15" />
        <stop offset="100%" stopColor="#0a2540" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="ct-device" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#eef4ff" />
      </linearGradient>
      <linearGradient id="ct-screen" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#dbeafe" />
        <stop offset="100%" stopColor="#eff6ff" />
      </linearGradient>
      <filter id="ct-shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="16" stdDeviation="20" floodColor="#06152e" floodOpacity="0.45" />
      </filter>
      <clipPath id="ct-clip"><rect x="186" y="120" width="188" height="212" rx="18" /></clipPath>
    </defs>

    <circle cx="280" cy="240" r="210" fill="url(#ct-blob)" />
    <circle cx="280" cy="240" r="196" stroke="#3b82f6" strokeOpacity="0.14" strokeWidth="1.5" />
    <circle cx="280" cy="240" r="150" stroke="#38bdf8" strokeOpacity="0.10" strokeWidth="1.5" />

    {/* Device */}
    <g filter="url(#ct-shadow)"><rect x="168" y="96" width="224" height="300" rx="30" fill="url(#ct-device)" /></g>
    <rect x="250" y="110" width="60" height="6" rx="3" fill="#dbe5f5" />
    <rect x="186" y="120" width="188" height="212" rx="18" fill="url(#ct-screen)" />

    {/* Doctor */}
    <g clipPath="url(#ct-clip)">
      {/* coat */}
      <path d="M204 336c0-45 34-70 76-70s76 25 76 70v16H204z" fill="#ffffff" />
      <path d="M204 352c1-26 11-46 27-56l6 8c-14 10-22 28-23 48z" fill="#eef3fb" />
      {/* scrubs (gola V) */}
      <path d="M259 296l21 30 21-30-6-8-15 20-15-20z" fill="#1d4ed8" />
      <path d="M280 326l-21-30-3 5 24 34 24-34-3-5z" fill="#1e40af" />
      {/* neck */}
      <rect x="271" y="284" width="18" height="20" rx="7" fill="#e7ad82" />
      <ellipse cx="280" cy="286" rx="12" ry="3.6" fill="#d99a6c" />
      {/* head */}
      <circle cx="280" cy="259" r="31" fill="#f4c9a6" />
      <path d="M311 254a31 31 0 0 1-7 25 31 31 0 0 0 5-25z" fill="#eab88b" />
      <circle cx="249" cy="261" r="5.2" fill="#f0bd93" />
      <circle cx="311" cy="261" r="5.2" fill="#f0bd93" />
      {/* hair */}
      <path d="M249 260C249 237 263 224 280 224C297 224 311 237 311 260C307 251 301 249 296 250C294 243 287 239 280 240C271 241 264 247 261 254C258 251 253 253 249 260Z" fill="#2f2620" />
      <path d="M287 231c8 2 14 9 15 18" stroke="#4a3d34" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.65" />
      {/* eyebrows */}
      <path d="M266 254q4-2.5 8-1.2" stroke="#2f2620" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M286 252.8q4-1.3 8 1.2" stroke="#2f2620" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* eyes */}
      <ellipse cx="271" cy="261" rx="2" ry="2.9" fill="#2f2620" />
      <ellipse cx="289" cy="261" rx="2" ry="2.9" fill="#2f2620" />
      {/* nose */}
      <path d="M280 262q2.5 5-1.5 7" stroke="#d99a6c" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* smile */}
      <path d="M271 274q9 7 18 0" stroke="#c67d54" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </g>

    {/* Call bar */}
    <rect x="214" y="350" width="132" height="30" rx="15" fill="#0f2f5e" />
    <circle cx="242" cy="365" r="10" fill="#22c55e" />
    <path d="M238 365l3 3 5-6" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="280" cy="365" r="10" fill="#3b82f6" />
    <rect x="275" y="361" width="7" height="8" rx="1.5" fill="#fff" />
    <path d="M283 363l4-2v6l-4-2z" fill="#fff" />
    <circle cx="318" cy="365" r="10" fill="#f87171" />
    <path d="M313 366c3-3 7-3 10 0l-2 3-2-1v-2c-1 0-2 0-2 0v2l-2 1z" fill="#fff" />

    {/* Chip: confirmado */}
    <g className="ct-a">
      <rect x="356" y="146" width="158" height="54" rx="15" fill="#ffffff" filter="url(#ct-shadow)" />
      <circle cx="384" cy="173" r="14" fill="#e7f8ee" />
      <path d="M378 173l4 4 8-9" stroke="#22c55e" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="406" y="163" width="90" height="8" rx="4" fill="#0f2f5e" />
      <rect x="406" y="179" width="62" height="6" rx="3" fill="#9db2cf" />
    </g>

    {/* Chip: agenda */}
    <g className="ct-b">
      <rect x="58" y="298" width="126" height="62" rx="15" fill="#ffffff" filter="url(#ct-shadow)" />
      <rect x="74" y="316" width="34" height="30" rx="7" fill="#eff6ff" />
      <rect x="74" y="316" width="34" height="10" rx="5" fill="#2563eb" />
      <circle cx="84" cy="336" r="3" fill="#2563eb" />
      <circle cx="98" cy="336" r="3" fill="#bfd3ff" />
      <rect x="118" y="320" width="50" height="8" rx="4" fill="#0f2f5e" />
      <rect x="118" y="335" width="36" height="6" rx="3" fill="#9db2cf" />
    </g>

    {/* Chip: pulso */}
    <g className="ct-c">
      <rect x="66" y="150" width="98" height="46" rx="13" fill="#ffffff" filter="url(#ct-shadow)" />
      <path d="M80 173h9l6-13 8 24 6-15h13" stroke="#ef4444" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>

    {/* Decorações */}
    <g fill="#38bdf8">
      <circle cx="432" cy="304" r="5" opacity="0.7" />
      <circle cx="150" cy="432" r="4" opacity="0.6" />
      <circle cx="408" cy="92" r="4" opacity="0.6" />
    </g>
    <g stroke="#7dd3fc" strokeWidth="3" strokeLinecap="round" opacity="0.7">
      <path d="M120 250h14M127 243v14" />
      <path d="M442 210h12M448 204v12" />
    </g>

    <style dangerouslySetInnerHTML={{ __html: `
      .ct-a{animation:ctFa 6s ease-in-out infinite}
      .ct-b{animation:ctFb 7s ease-in-out infinite}
      .ct-c{animation:ctFc 5.5s ease-in-out infinite}
      @keyframes ctFa{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
      @keyframes ctFb{0%,100%{transform:translateY(0)}50%{transform:translateY(9px)}}
      @keyframes ctFc{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
      @media (prefers-reduced-motion: reduce){.ct-a,.ct-b,.ct-c{animation:none}}
    ` }} />
  </svg>
);

export default HeroIllustration;
