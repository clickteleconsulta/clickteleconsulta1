import React from 'react';
import { motion } from 'framer-motion';

/**
 * Ilustração do hero — vetor próprio, no espírito das cenas de elenco que os
 * grandes marketplaces de saúde usam: um grupo de pessoas sobre uma elipse,
 * em formas planas e geométricas.
 *
 * Por que existe: o hero estava monocromático em azul. A cena é o lugar certo
 * para trazer as cores quentes da paleta secundária (coral, âmbar, tons de pele)
 * sem poluir a interface, que continua sóbria.
 *
 * Nada de rosto detalhado — as feições são mínimas de propósito: é o que mantém
 * a ilustração legível em qualquer tamanho e evita o efeito de clip-art.
 */

const PELE = { clara: '#F0C9A4', media: '#C98B5E', escura: '#8A5433' };
const CABELO = { escuro: '#241C18', castanho: '#4A3527', grisalho: '#CFCAC3' };

/** Feições mínimas: dois olhos e um sorriso. Sem elas as figuras leem como manequim. */
const Rosto = ({ cy, largura = 7 }) => (
  <g>
    <circle cx={-largura} cy={cy - 3} r="2.3" fill="#241C18" />
    <circle cx={largura} cy={cy - 3} r="2.3" fill="#241C18" />
    <path
      d={`M${-largura + 1} ${cy + 5} Q0 ${cy + 10} ${largura - 1} ${cy + 5}`}
      fill="none"
      stroke="#241C18"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </g>
);

/** Braço: retângulo arredondado com rotação a partir do ombro. */
const Braco = ({ x, y, cor, rot = 0, h = 60 }) => (
  <rect x={x} y={y} width="13" height={h} rx="6.5" fill={cor} transform={`rotate(${rot} ${x + 6.5} ${y})`} />
);

/** Perna. */
const Perna = ({ x, y, cor, h = 78 }) => (
  <rect x={x} y={y} width="16" height={h} rx="8" fill={cor} />
);

/* ── Médica: jaleco branco, blusa na cor da marca, estetoscópio coral ── */
const Medica = () => (
  <g transform="translate(150 0)">
    <Perna x={-18} y={282} cor="#2C4171" />
    <Perna x={4} y={282} cor="#2C4171" />
    <rect x={-22} y={352} width="20" height="10" rx="5" fill="#F2F5FB" />
    <rect x={2} y={352} width="20" height="10" rx="5" fill="#F2F5FB" />

    {/* torso: jaleco */}
    <path d="M-30 288 V232 Q-30 210 -10 206 H10 Q30 210 30 232 V288 Z" fill="#FFFFFF" />
    {/* abertura do jaleco, mostrando a blusa */}
    <path d="M-9 206 L0 232 L9 206 Z" fill="#3B5BA5" />
    <path d="M-9 206 L0 232 L9 206 L9 288 L-9 288 Z" fill="#3B5BA5" opacity="0.9" />

    {/* estetoscópio */}
    <path d="M-7 210 Q-16 244 -2 254 Q12 264 16 240" fill="none" stroke="#E8674C" strokeWidth="4" strokeLinecap="round" />
    <circle cx="17" cy="236" r="6" fill="#E8674C" />

    <Braco x={-42} y={212} cor="#FFFFFF" rot={7} h={66} />
    <Braco x={30} y={212} cor="#FFFFFF" rot={-7} h={66} />

    <rect x={-6} y={190} width="12" height="20" rx="5" fill={PELE.clara} />
    <circle cx="0" cy="176" r="21" fill={PELE.clara} />
    <Rosto cy={176} />
    {/* cabelo: calota + laterais até o ombro */}
    <path d="M-21 176 A21 21 0 0 1 21 176 L21 168 A21 21 0 0 0 -21 168 Z" fill={CABELO.escuro} />
    <path d="M-21 170 Q-25 200 -19 210 L-13 208 Q-18 190 -16 172 Z" fill={CABELO.escuro} />
    <path d="M21 170 Q25 200 19 210 L13 208 Q18 190 16 172 Z" fill={CABELO.escuro} />
  </g>
);

/* ── Paciente jovem: blusa coral, segurando o celular ── */
const Jovem = () => (
  <g transform="translate(280 0)">
    <Perna x={-19} y={286} cor="#22304D" h={74} />
    <Perna x={5} y={286} cor="#22304D" h={74} />
    <rect x={-23} y={352} width="20" height="10" rx="5" fill="#E8674C" />
    <rect x={3} y={352} width="20" height="10" rx="5" fill="#E8674C" />

    <path d="M-28 292 V238 Q-28 216 -9 212 H9 Q28 216 28 238 V292 Z" fill="#F0785C" />

    <Braco x={-40} y={218} cor="#F0785C" rot={10} h={58} />
    {/* braço dobrado segurando o celular */}
    <Braco x={28} y={218} cor="#F0785C" rot={-34} h={50} />
    <rect x={40} y={246} width="19" height="30" rx="4" fill="#1B2333" transform="rotate(-16 49 261)" />
    <rect x={43} y={250} width="13" height="22" rx="2" fill="#9FB4DE" transform="rotate(-16 49 261)" />

    <rect x={-6} y={196} width="12" height="20" rx="5" fill={PELE.escura} />
    <circle cx="0" cy="182" r="21" fill={PELE.escura} />
    <Rosto cy={182} />
    {/* cabelo crespo: aglomerado de círculos */}
    <g fill={CABELO.escuro}>
      <circle cx="-16" cy="170" r="11" /><circle cx="0" cy="163" r="12" />
      <circle cx="16" cy="170" r="11" /><circle cx="-20" cy="182" r="8" />
      <circle cx="20" cy="182" r="8" />
    </g>
  </g>
);

/* ── Paciente sênior: suéter âmbar ── */
const Senior = () => (
  <g transform="translate(408 0)">
    <Perna x={-18} y={284} cor="#34405C" h={76} />
    <Perna x={4} y={284} cor="#34405C" h={76} />
    <rect x={-22} y={352} width="20" height="10" rx="5" fill="#2C4171" />
    <rect x={2} y={352} width="20" height="10" rx="5" fill="#2C4171" />

    <path d="M-29 290 V236 Q-29 214 -10 210 H10 Q29 214 29 236 V290 Z" fill="#F2B441" />
    <Braco x={-41} y={216} cor="#F2B441" rot={8} h={62} />
    <Braco x={29} y={216} cor="#F2B441" rot={-8} h={62} />

    <rect x={-6} y={194} width="12" height="20" rx="5" fill={PELE.media} />
    <circle cx="0" cy="180" r="20" fill={PELE.media} />
    <Rosto cy={180} />
    {/* cabelo grisalho com volume nas laterais */}
    <path d="M-20 178 A20 20 0 0 1 20 178 Q20 168 12 164 Q0 158 -12 164 Q-20 168 -20 178 Z" fill={CABELO.grisalho} />
    <path d="M-20 176 Q-24 190 -19 196 L-15 194 Q-19 186 -18 176 Z" fill={CABELO.grisalho} />
    <path d="M20 176 Q24 190 19 196 L15 194 Q19 186 18 176 Z" fill={CABELO.grisalho} />
  </g>
);

const HeroScene = () => (
  <div className="relative w-full max-w-[560px]">
    <svg viewBox="0 0 560 420" className="w-full" role="img" aria-label="Ilustração de uma médica e dois pacientes">
      {/* elipse do chão */}
      <ellipse cx="285" cy="362" rx="250" ry="36" fill="#ffffff" opacity="0.10" />
      {/* círculo de fundo */}
      <circle cx="300" cy="230" r="168" fill="#ffffff" opacity="0.06" />

      <Senior />
      <Jovem />
      <Medica />
    </svg>

    {/* cartão de confirmação, ancorado à cena */}
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
      className="absolute -left-2 bottom-12 flex items-center gap-2.5 rounded-lg bg-white px-4 py-3 shadow-xl shadow-black/25"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="font-display block text-[12.5px] font-bold text-slate-900">Consulta confirmada</span>
        <span className="block text-[11px] text-slate-500">Quinta, 6 de agosto · 14h00</span>
      </span>
    </motion.div>

    {/* pílula de preço */}
    <motion.div
      animate={{ y: [0, 9, 0] }}
      transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut', delay: 0.7 }}
      className="absolute right-0 top-8 rounded-lg bg-white px-4 py-3 shadow-xl shadow-black/25"
    >
      <span className="font-display block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
        A partir de
      </span>
      <span className="font-display block text-[19px] font-extrabold tracking-tight text-slate-900 tabular-nums">
        R$ 40,00
      </span>
    </motion.div>
  </div>
);

export default HeroScene;
