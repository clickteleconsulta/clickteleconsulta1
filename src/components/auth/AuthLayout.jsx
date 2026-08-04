import React from 'react';
import { Link } from 'react-router-dom';
import Wordmark, { TAMANHOS } from '@/components/Wordmark';
import { Stethoscope, CalendarCheck, ShieldCheck, Wallet, Clock, MonitorSmartphone, UserCheck } from 'lucide-react';
import { BRAND } from '@/config/brand';

// Painel de marca por público — o lado esquerdo (desktop) muda conforme cliente/profissional.
const PANELS = {
    cliente: {
        eyebrow: null,
        title: 'Sua consulta marcada em minutos.',
        subtitle: 'Marketplace de agendamento: escolha o médico e agende. O atendimento é feito pelo próprio profissional.',
        features: [
            { icon: UserCheck, label: 'Escolha entre médicos parceiros verificados (CFM)' },
            { icon: CalendarCheck, label: 'Agende em minutos, sem filas' },
            { icon: ShieldCheck, label: 'Protegido e sigiloso — conforme a LGPD' },
        ],
    },
    profissional: {
        eyebrow: 'Portal do Parceiro',
        title: 'Receba agendamentos para seus atendimentos por telemedicina.',
        subtitle: 'Seja parceiro do nosso marketplace de agendamentos: você conduz o atendimento e a plataforma cuida do agendamento e do pagamento.',
        features: [
            { icon: Clock, label: 'Defina seus horários e disponibilidade' },
            { icon: Wallet, label: 'Acompanhe repasses e solicite saques' },
            { icon: MonitorSmartphone, label: 'Acesse do computador ou do celular' },
        ],
    },
};

// Layout compartilhado das telas de acesso: painel de marca à esquerda (desktop),
// formulário à direita. No mobile, mostra só o formulário com o logo no topo.
const AuthLayout = ({ variant = 'cliente', children }) => {
    const p = PANELS[variant] || PANELS.cliente;

    return (
        <div className="w-full max-w-5xl mx-auto flex rounded-lg overflow-hidden shadow-xl border border-gray-100 bg-white min-h-[560px]">
            {/* Painel de marca (desktop) */}
            <div
                className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col justify-between p-10 text-white"
                style={{ background: BRAND.color }}
            >
                <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -bottom-28 -left-16 w-80 h-80 rounded-full bg-white/10 blur-3xl" />

                <Link to="/" className="relative inline-flex items-center w-fit">
                    {/* Sobre a cor da marca o logo vai todo em branco. */}
                    <Wordmark size={TAMANHOS.destaque} ink="#ffffff" dark />
                </Link>

                <div className="relative space-y-5 max-w-sm">
                    {p.eyebrow && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-semibold">
                            <Stethoscope className="w-3.5 h-3.5" /> {p.eyebrow}
                        </span>
                    )}
                    <h2 className="text-3xl font-bold leading-tight tracking-tight">
                        {p.title}
                    </h2>
                    <p className="text-white/85 text-sm leading-relaxed">{p.subtitle}</p>
                    <ul className="space-y-3 pt-1">
                        {p.features.map((f, i) => (
                            <li key={i} className="flex items-center gap-3">
                                <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/15 shrink-0">
                                    <f.icon className="w-5 h-5" />
                                </span>
                                <span className="text-sm text-white/90">{f.label}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="relative flex items-center gap-2 text-xs text-white/70">
                    <ShieldCheck className="w-4 h-4" /> Conexão segura · Dados protegidos (LGPD)
                </div>
            </div>

            {/* Formulário */}
            <div className="flex-1 flex flex-col items-center justify-center px-5 sm:px-10 py-10 bg-white">
                <Link to="/" className="lg:hidden inline-flex items-center mb-6">
                    <Wordmark size={TAMANHOS.destaque} />
                </Link>
                <div className="w-full max-w-[400px]">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
