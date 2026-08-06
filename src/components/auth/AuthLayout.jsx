import React from 'react';
import { Link } from 'react-router-dom';
import Wordmark, { TAMANHOS } from '@/components/Wordmark';
import { CalendarCheck, ShieldCheck, Wallet, Clock, MonitorSmartphone, UserCheck } from 'lucide-react';

/**
 * Telas de acesso — cliente e profissional.
 *
 * O painel da esquerda era um bloco chapado na cor da marca, com texto branco,
 * ícones dentro de caixas translúcidas e dois borrões desfocados no fundo. Era
 * muito peso visual para uma tela cujo único trabalho é sair da frente: quem
 * chega aqui quer entrar, não ler um anúncio.
 *
 * Agora o peso vai para a ILUSTRAÇÃO e o resto recua. Fundo claro, texto em
 * tinta, ícones soltos sem caixa. A cor forte sobrou só onde decide algo — o
 * botão de enviar.
 *
 * Cada público tem sua arte E sua cor: cliente em cobalto, profissional em
 * jade. É o que faz a pessoa perceber num relance se está na porta certa, sem
 * precisar ler o cabeçalho. (A cor vive no SVG; ver tools/recolorir-ilustracoes.py.)
 */
const PANELS = {
    cliente: {
        arte: '/ilustra/acesso-cliente.svg',
        title: 'Sua consulta marcada em minutos.',
        subtitle: 'Marketplace de agendamento: escolha o médico e agende. O atendimento é feito pelo próprio profissional.',
        features: [
            { icon: UserCheck, label: 'Escolha entre médicos parceiros com registro conferido' },
            { icon: CalendarCheck, label: 'Agende em minutos, sem filas' },
            { icon: ShieldCheck, label: 'Protegido e sigiloso — conforme a LGPD' },
        ],
    },
    profissional: {
        arte: '/ilustra/acesso-profissional.svg',
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

const AuthLayout = ({ variant = 'cliente', children }) => {
    const p = PANELS[variant] || PANELS.cliente;

    return (
        // `items-stretch` e não `min-h` fixo: a coluna do formulário cresce com o
        // cadastro (que tem muito mais campos que o login) e o painel acompanha,
        // em vez de sobrar espaço vazio numa tela e faltar na outra.
        <div className="w-full max-w-5xl mx-auto grid lg:grid-cols-2 items-stretch rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm">

            {/* Painel de marca — desktop */}
            <div className="hidden lg:flex flex-col justify-between gap-8 p-10 bg-slate-50/70 border-r border-slate-200">
                {/* `compacto` (24 px), não `destaque`. Aqui o logo é assinatura e
                    caminho de volta para a home — quem já está na tela de acesso
                    sabe onde está. Em 40 px ele competia com a ilustração e com
                    o título, que são o que a tela tem a dizer. */}
                <Link to="/" className="inline-flex w-fit">
                    <Wordmark size={TAMANHOS.compacto} />
                </Link>

                <div>
                    {/* A arte é decorativa: tudo que ela diz está escrito ao lado. */}
                    <img
                        src={p.arte}
                        alt=""
                        aria-hidden="true"
                        className="w-full max-w-[260px] mx-auto mb-9 select-none pointer-events-none"
                    />

                    {p.eyebrow && (
                        <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-brand-600 mb-2">
                            {p.eyebrow}
                        </span>
                    )}
                    <h2 className="text-[26px] leading-[1.2] font-extrabold text-slate-900 tracking-tight">
                        {p.title}
                    </h2>
                    <p className="text-sm text-slate-500 leading-relaxed mt-3">{p.subtitle}</p>

                    {/* Ícones soltos, sem caixa: a caixa translúcida do desenho
                        antigo criava três blocos que competiam com o texto. */}
                    <ul className="space-y-3 mt-7">
                        {p.features.map((f) => (
                            <li key={f.label} className="flex items-start gap-3">
                                <f.icon className="w-[18px] h-[18px] text-brand-600 shrink-0 mt-0.5" />
                                <span className="text-sm text-slate-600 leading-snug">{f.label}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="text-xs text-slate-400">Proteção LGPD</p>
            </div>

            {/* Formulário */}
            <div className="flex flex-col justify-center px-5 sm:px-10 py-10">
                {/* No celular o painel da esquerda não existe, e sem isto a tela
                    ficava sendo dois campos num fundo branco. A arte volta em
                    tamanho pequeno — o suficiente para a tela ter identidade sem
                    empurrar o formulário de cadastro, que é longo, para baixo. */}
                <div className="lg:hidden flex flex-col items-center mb-8">
                    <Link to="/" className="inline-flex">
                        <Wordmark size={TAMANHOS.compacto} />
                    </Link>
                    <img
                        src={p.arte}
                        alt=""
                        aria-hidden="true"
                        className="w-full max-w-[150px] mt-6 select-none pointer-events-none"
                    />
                </div>
                {/* 360 e não 400: campo largo demais faz o olho percorrer uma
                    linha longa para escrever um e-mail curto, e a coluna fica
                    parecendo um formulário de cadastro completo mesmo no login. */}
                <div className="w-full max-w-[360px] mx-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
