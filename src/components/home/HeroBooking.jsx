import React from 'react';
import { motion } from 'framer-motion';
import { Video, ShieldCheck, Check, User } from 'lucide-react';

/**
 * Ilustração do hero: o próprio produto.
 *
 * Substituiu três cards de vidro soltos que não formavam uma cena e traziam
 * texto solto (inclusive em inglês). Aqui a pessoa vê, antes de rolar a página,
 * exatamente o que vai fazer no site: escolher o médico, ver o preço, pegar um
 * horário. Nada de foto — é vetor, na paleta da marca.
 */
const SLOTS = ['13:40', '14:00', '14:20', '14:40', '15:00', '15:20'];
const SELECIONADO = '14:00';

const HeroBooking = () => (
  <div className="relative flex items-center justify-center">
    {/* halo suave atrás do card */}
    <div
      aria-hidden="true"
      className="absolute w-[420px] h-[420px] rounded-full bg-brand-400/20 blur-3xl"
    />
    <div
      aria-hidden="true"
      className="absolute w-[520px] h-[520px] rounded-full border border-white/[0.07]"
    />

    <motion.div
      animate={{ y: [0, -10, 0] }}
      transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
      className="relative w-[330px] rounded-lg bg-white p-5 shadow-2xl shadow-black/30"
    >
      {/* médico */}
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-brand-100">
          <User className="h-6 w-6 text-brand-600" />
        </div>
        <div className="min-w-0">
          <p className="font-display flex items-center gap-1.5 text-[15px] font-bold leading-tight text-slate-900">
            Dra. Helena Prado
            <ShieldCheck className="h-4 w-4 shrink-0 text-brand-600" />
          </p>
          <p className="text-xs text-slate-500">Médica · Generalista</p>
          <p className="text-[11px] text-slate-400">CRM 000000/SP</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-green-100 bg-green-50 px-2.5 text-[12px] font-semibold leading-none text-green-700">
          <Video className="h-3.5 w-3.5 shrink-0 text-green-500" />
          Teleconsulta
        </span>
        <span className="inline-flex h-7 items-center rounded-full border border-slate-200/70 bg-slate-100 px-3 text-[13px] font-extrabold leading-none tracking-tight text-slate-900 tabular-nums">
          R$ 40,00
        </span>
      </div>

      <div className="my-4 h-px bg-slate-100" />

      <p className="font-display mb-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
        Quinta, 6 de agosto
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {SLOTS.map((hora) => {
          const ativo = hora === SELECIONADO;
          return (
            <span
              key={hora}
              className={
                ativo
                  ? 'rounded-full bg-brand-600 py-1.5 text-center text-[12px] font-bold text-white'
                  : 'rounded-full bg-brand-50 py-1.5 text-center text-[12px] font-bold text-brand-600'
              }
            >
              {hora}
            </span>
          );
        })}
      </div>

      <div className="font-display mt-4 rounded-full bg-slate-900 py-2.5 text-center text-[13px] font-bold text-white">
        Agendar consulta
      </div>
    </motion.div>

    {/* confirmação, sobreposta ao card */}
    <motion.div
      animate={{ y: [0, 8, 0] }}
      transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut', delay: 0.6 }}
      className="absolute -bottom-7 -left-7 flex items-center gap-2.5 rounded-md bg-white px-3.5 py-2.5 shadow-xl shadow-black/25"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100">
        <Check className="h-4 w-4 text-green-700" strokeWidth={3} />
      </span>
      <span className="leading-tight">
        <span className="font-display block text-[12px] font-bold text-slate-900">
          Consulta confirmada
        </span>
        <span className="block text-[11px] text-slate-500">Pagamento por Pix aprovado</span>
      </span>
    </motion.div>
  </div>
);

export default HeroBooking;
