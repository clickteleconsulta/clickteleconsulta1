import React from 'react';
import { Helmet } from 'react-helmet';

const DEFAULT_MSG = 'Estamos realizando melhorias na plataforma para atendê-lo melhor. Voltamos em instantes.';

// Página exibida a visitantes e pacientes enquanto o site está em manutenção.
// Administradores não veem esta tela (o acesso ao painel continua liberado).
const MaintenancePage = ({ message }) => (
  <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-gradient-to-b from-blue-50 via-white to-white">
    <Helmet>
      <title>Em manutenção · Click Teleconsulta</title>
      <meta name="robots" content="noindex" />
    </Helmet>

    <div className="max-w-md">
      <div className="mx-auto mb-7 w-20 h-20 rounded-2xl bg-white shadow-lg shadow-blue-500/10 border border-blue-100 flex items-center justify-center">
        <svg viewBox="0 0 48 48" className="w-11 h-11">
          <path d="M6 26h7l3-11 5 20 4-13 2.5 6H42" fill="none" stroke="#2563eb" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <p className="text-sm font-bold tracking-widest text-blue-600 uppercase mb-3">Click Teleconsulta</p>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-4">
        Voltamos já&nbsp;já
      </h1>
      <p className="text-gray-500 leading-relaxed">
        {message || DEFAULT_MSG}
      </p>

      <div className="mt-8 flex items-center justify-center gap-1.5" aria-hidden="true">
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" />
      </div>
    </div>

    <p className="mt-12 text-xs text-gray-400">
      Já tem uma consulta agendada? O atendimento acontece normalmente pelo seu médico no horário marcado.
    </p>
  </div>
);

export default MaintenancePage;
