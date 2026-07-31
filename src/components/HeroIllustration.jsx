import React from 'react';

// Ilustração vetorial própria (flat, azul) para o hero: um app mostrando a própria
// tela de agendamento (card do médico verificado + horários + botão), com chips
// flutuantes (agenda, consulta confirmada, pagamento Pix/cartão). Arte autoral.
// Sem rostos — foco no produto (marketplace de agendamentos). Respeita prefers-reduced-motion.
const HeroIllustration = ({ className = '' }) => (
  <svg
    className={className}
    viewBox="0 0 560 520"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Ilustração do app da Click Teleconsulta: tela de agendamento com médico verificado, horários disponíveis e botão de agendar"
  >
    <defs>
      <radialGradient id="ci-blob" cx="50%" cy="45%" r="60%">
        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.55" />
        <stop offset="60%" stopColor="#1d4ed8" stopOpacity="0.14" />
        <stop offset="100%" stopColor="#0a2540" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="ci-dev" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#eef4ff" />
      </linearGradient>
      <linearGradient id="ci-ava" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#2563eb" />
      </linearGradient>
      <linearGradient id="ci-btn" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#2563eb" />
      </linearGradient>
      <filter id="ci-sh" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="16" stdDeviation="22" floodColor="#06152e" floodOpacity="0.45" />
      </filter>
      <clipPath id="ci-scr"><rect x="184" y="80" width="192" height="340" rx="22" /></clipPath>
    </defs>

    <circle cx="280" cy="240" r="212" fill="url(#ci-blob)" />
    <circle cx="280" cy="240" r="196" stroke="#3b82f6" strokeOpacity="0.14" strokeWidth="1.5" />
    <circle cx="280" cy="240" r="150" stroke="#38bdf8" strokeOpacity="0.10" strokeWidth="1.5" />

    {/* Device */}
    <g filter="url(#ci-sh)"><rect x="168" y="60" width="224" height="380" rx="34" fill="url(#ci-dev)" /></g>
    <rect x="256" y="72" width="48" height="6" rx="3" fill="#dbe5f5" />
    <rect x="184" y="80" width="192" height="340" rx="22" fill="#ffffff" />

    <g clipPath="url(#ci-scr)">
      {/* Doctor row */}
      <rect x="200" y="100" width="44" height="44" rx="13" fill="url(#ci-ava)" />
      <circle cx="222" cy="116" r="6.5" fill="#fff" />
      <path d="M210 138c0-7 5.5-12 12-12s12 5 12 12z" fill="#fff" />
      <rect x="252" y="106" width="80" height="9" rx="4.5" fill="#1e293b" />
      <g transform="translate(340,104)">
        <path d="M8 0l1.7 1.2 2.1-.1.7 2 1.8 1.1-.5 2 .7 2-1.6 1.4.1 2.1-2 .5-1.2 1.8-2-.5-1.8 1.1-1.8-1.1-2 .5-1.2-1.8-2-.5.1-2.1-1.6-1.4.7-2-.5-2 1.8-1.1.7-2 2.1.1z" fill="#2563eb" />
        <path d="M5.4 8.2l1.8 1.8 3.6-3.8" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <rect x="252" y="121" width="60" height="7" rx="3.5" fill="#cbd5e1" />
      <g fill="#fbbf24">
        <circle cx="254" cy="139" r="2.6" /><circle cx="263" cy="139" r="2.6" /><circle cx="272" cy="139" r="2.6" /><circle cx="281" cy="139" r="2.6" /><circle cx="290" cy="139" r="2.6" />
      </g>
      <rect x="298" y="136" width="16" height="6" rx="3" fill="#e2e8f0" />

      {/* pills */}
      <rect x="200" y="158" width="74" height="20" rx="10" fill="#eff6ff" stroke="#dbeafe" />
      <circle cx="211" cy="168" r="3" fill="#3b82f6" /><rect x="219" y="165" width="44" height="6" rx="3" fill="#93c5fd" />
      <rect x="282" y="158" width="78" height="20" rx="10" fill="#ecfdf5" stroke="#d1fae5" />
      <circle cx="293" cy="168" r="3" fill="#10b981" /><rect x="301" y="165" width="48" height="6" rx="3" fill="#6ee7b7" />

      <line x1="200" y1="192" x2="360" y2="192" stroke="#eef2f7" strokeWidth="1.5" />
      <text x="200" y="209" fontFamily="Arial, sans-serif" fontSize="8" fontWeight="700" letterSpacing="1.2" fill="#94a3b8">HORÁRIOS DISPONÍVEIS</text>

      {/* slots */}
      <g fontFamily="Arial, sans-serif" fontSize="11" fontWeight="700" textAnchor="middle">
        <rect x="200" y="218" width="74" height="24" rx="12" fill="#2563eb" /><text x="237" y="234" fill="#fff">08:00</text>
        <rect x="286" y="218" width="74" height="24" rx="12" fill="#eff6ff" /><text x="323" y="234" fill="#2563eb">08:30</text>
        <rect x="200" y="248" width="74" height="24" rx="12" fill="#eff6ff" /><text x="237" y="264" fill="#2563eb">09:00</text>
        <rect x="286" y="248" width="74" height="24" rx="12" fill="#eff6ff" /><text x="323" y="264" fill="#2563eb">09:30</text>
        <rect x="200" y="278" width="74" height="24" rx="12" fill="#eff6ff" /><text x="237" y="294" fill="#2563eb">10:00</text>
        <rect x="286" y="278" width="74" height="24" rx="12" fill="#eff6ff" /><text x="323" y="294" fill="#2563eb">10:30</text>
      </g>

      {/* button + home indicator */}
      <rect x="200" y="330" width="160" height="36" rx="12" fill="url(#ci-btn)" />
      <text x="280" y="353" fontFamily="Arial, sans-serif" fontSize="12.5" fontWeight="700" fill="#fff" textAnchor="middle">Agendar consulta</text>
      <rect x="256" y="400" width="48" height="5" rx="2.5" fill="#e2e8f0" />
    </g>

    {/* Floating: agenda (top-left) */}
    <g className="ci-fb">
      <rect x="46" y="150" width="112" height="58" rx="15" fill="#fff" filter="url(#ci-sh)" />
      <rect x="62" y="168" width="30" height="26" rx="6" fill="#eff6ff" /><rect x="62" y="168" width="30" height="9" rx="4" fill="#2563eb" />
      <circle cx="71" cy="186" r="2.5" fill="#2563eb" /><circle cx="83" cy="186" r="2.5" fill="#bfd3ff" />
      <rect x="102" y="171" width="44" height="7" rx="3.5" fill="#0f2f5e" /><rect x="102" y="184" width="32" height="6" rx="3" fill="#9db2cf" />
    </g>

    {/* Floating: confirmado (top-right) */}
    <g className="ci-fa">
      <rect x="356" y="146" width="158" height="54" rx="15" fill="#fff" filter="url(#ci-sh)" />
      <circle cx="384" cy="173" r="14" fill="#e7f8ee" /><path d="M378 173l4 4 8-9" stroke="#22c55e" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="406" y="163" width="90" height="8" rx="4" fill="#0f2f5e" /><rect x="406" y="179" width="62" height="6" rx="3" fill="#9db2cf" />
    </g>

    {/* Floating: pagamento (bottom-left) */}
    <g className="ci-fc">
      <rect x="34" y="326" width="176" height="52" rx="15" fill="#fff" filter="url(#ci-sh)" />
      <rect x="50" y="342" width="30" height="20" rx="5" fill="#eff6ff" /><rect x="50" y="342" width="30" height="7" rx="3" fill="#2563eb" /><rect x="54" y="354" width="10" height="3" rx="1.5" fill="#93c5fd" />
      <rect x="92" y="344" width="104" height="7" rx="3.5" fill="#0f2f5e" /><rect x="92" y="357" width="72" height="6" rx="3" fill="#9db2cf" />
    </g>

    {/* Decorações */}
    <g fill="#38bdf8">
      <circle cx="430" cy="316" r="5" opacity="0.7" /><circle cx="150" cy="452" r="4" opacity="0.6" /><circle cx="406" cy="96" r="4" opacity="0.6" />
    </g>
    <g stroke="#7dd3fc" strokeWidth="3" strokeLinecap="round" opacity="0.7">
      <path d="M120 270h14M127 263v14" /><path d="M446 232h12M452 226v12" />
    </g>

    <style dangerouslySetInnerHTML={{ __html: `
      .ci-fa{animation:ciFa 6s ease-in-out infinite}
      .ci-fb{animation:ciFb 7s ease-in-out infinite}
      .ci-fc{animation:ciFc 5.5s ease-in-out infinite}
      @keyframes ciFa{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
      @keyframes ciFb{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
      @keyframes ciFc{0%,100%{transform:translateY(0)}50%{transform:translateY(9px)}}
      @media (prefers-reduced-motion: reduce){.ci-fa,.ci-fb,.ci-fc{animation:none}}
    ` }} />
  </svg>
);

export default HeroIllustration;
