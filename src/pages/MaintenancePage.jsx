import React from 'react';
import { BRAND } from '@/config/brand';
import { Helmet } from 'react-helmet';
import { BrandCapsule } from '@/components/Logo';
import Wordmark from '@/components/Wordmark';

const DEFAULT_MSG = 'Estamos realizando melhorias na plataforma para atendê-lo melhor. Voltamos em instantes.';

// Página exibida a visitantes e pacientes enquanto o site está em manutenção.
// Administradores não veem esta tela (o acesso ao painel continua liberado).
const MaintenancePage = ({ message }) => (
  <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-gradient-to-b from-brand-50 via-white to-white">
    <Helmet>
      <title>{`Em manutenção · ${BRAND.name}`}</title>
      <meta name="robots" content="noindex" />
    </Helmet>

    <div className="max-w-md">
      <div className="mx-auto mb-7 w-20 h-20 rounded-2xl bg-white shadow-lg shadow-brand-500/10 border border-brand-100 flex items-center justify-center">
        <svg viewBox="0 0 104 44" className="w-14" aria-hidden="true">
          <BrandCapsule color="#3B5BA5" />
        </svg>
      </div>

      <div className="flex justify-center mb-4">
        <Wordmark size={26} />
      </div>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-4">
        Voltamos já&nbsp;já
      </h1>
      <p className="text-gray-500 leading-relaxed">
        {message || DEFAULT_MSG}
      </p>

      <div className="mt-8 flex items-center justify-center gap-1.5" aria-hidden="true">
        <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" />
      </div>
    </div>

    <p className="mt-12 text-xs text-gray-400">
      Já tem uma consulta agendada? O atendimento acontece normalmente pelo seu médico no horário marcado.
    </p>
  </div>
);

export default MaintenancePage;
