import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import {
    LifeBuoy, Mail, ArrowRight, BookOpen, Video, CalendarClock,
    Stethoscope, FileText, ShieldCheck, Wallet, Star, HeartPulse
} from 'lucide-react';
import { Link } from 'react-router-dom';
import DoctorPageHeader from '@/components/doctor/DoctorPageHeader';

// Manual de Boas Práticas — exclusivo do dashboard médico (medico/dashboard/ajuda).
// Conteúdo original, simplificado e alinhado às funcionalidades da Click Teleconsulta.
const manual = [
    {
        icon: BookOpen,
        title: 'Como a plataforma funciona',
        points: [
            'A Click Teleconsulta é um marketplace que conecta pacientes a médicos parceiros. Você atua com autonomia: define sua agenda, seus horários e realiza os atendimentos.',
            'A plataforma cuida da parte tecnológica: agendamento, pagamento, repasse e armazenamento dos dados. A consulta só é liberada para você após o pagamento do paciente ser confirmado.',
            'A responsabilidade clínica pelo atendimento (diagnóstico, conduta, prescrição e prontuário) é sempre do médico.',
        ],
    },
    {
        icon: CalendarClock,
        title: 'Configurando sua agenda e procedimentos',
        points: [
            'Em Agenda, cadastre seus blocos de disponibilidade por dia da semana, com horário de início, fim e o intervalo entre consultas. Só aparecem para o paciente os horários que você liberar.',
            'Em Procedimentos, o serviço padrão "Teleconsulta" já vem criado como principal. Você pode ajustar apenas o seu valor de repasse, entre R$ 30 e R$ 150.',
            'O valor que o paciente paga é o seu repasse acrescido da taxa da plataforma. A taxa aplicada fica registrada no momento do pagamento e não muda depois.',
        ],
    },
    {
        icon: Video,
        title: 'Antes da teleconsulta',
        points: [
            'Use uma conexão estável de internet e teste câmera e microfone com antecedência.',
            'Escolha um ambiente reservado, silencioso e bem iluminado, que preserve o sigilo do atendimento.',
            'Esteja disponível no horário agendado. O paciente é orientado de que você entrará em contato até 15 minutos antes do início.',
            'Vista-se de forma adequada e mantenha uma postura profissional, como em uma consulta presencial.',
        ],
    },
    {
        icon: HeartPulse,
        title: 'Durante o atendimento',
        points: [
            'Confirme a identidade do paciente no início da consulta e apresente-se.',
            'Conduza a anamnese com atenção e explique com clareza a conduta e as orientações.',
            'Avalie se o caso é adequado ao atendimento a distância. Se necessário, oriente avaliação presencial ou encaminhamento.',
            'A plataforma não se destina a urgências e emergências. Nesses casos, oriente o paciente a procurar atendimento presencial imediato (SAMU 192).',
        ],
    },
    {
        icon: FileText,
        title: 'Documentos e prescrições',
        points: [
            'Receitas, atestados e demais documentos devem ser emitidos conforme a legislação, preferencialmente com assinatura digital válida (certificado ICP-Brasil).',
            'Registre o atendimento e mantenha o prontuário sob sua guarda e responsabilidade, respeitando o sigilo médico.',
        ],
    },
    {
        icon: Stethoscope,
        title: 'Telemedicina e ética',
        points: [
            'Atue sempre dentro dos limites da sua habilitação e do Código de Ética Médica.',
            'A prática de telemedicina segue as normas do Conselho Federal de Medicina (Resolução CFM nº 2.314/2022 ou norma vigente).',
            'Mantenha seu CRM ativo e sua documentação atualizada na plataforma.',
        ],
    },
    {
        icon: ShieldCheck,
        title: 'Privacidade e dados do paciente (LGPD)',
        points: [
            'Trate os dados do paciente apenas para a finalidade do atendimento e mantenha sigilo absoluto.',
            'Não compartilhe telas, gravações ou informações do paciente sem base legal e sem necessidade.',
            'Nunca solicite pagamento por fora da plataforma para consultas nela agendadas.',
        ],
    },
    {
        icon: Wallet,
        title: 'Financeiro: repasse e saques',
        points: [
            'Após a confirmação do pagamento, o valor de repasse fica disponível no seu extrato em Financeiro.',
            'Você solicita o saque selecionando as guias disponíveis, respeitando o período de carência da plataforma.',
            'A coluna "Valor" no extrato representa o seu repasse líquido — a taxa da plataforma não entra nesse valor.',
        ],
    },
    {
        icon: Star,
        title: 'Avaliações dos pacientes',
        points: [
            'Após a consulta, o paciente pode avaliar o atendimento. Boas avaliações aumentam a confiança e a sua visibilidade.',
            'Se receber uma avaliação que considere indevida, você pode denunciá-la em Avaliações — a administração fará a análise.',
        ],
    },
];

const DoctorHelp = () => {
    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-8">
            <DoctorPageHeader icon={LifeBuoy} title="Central de Ajuda" subtitle="Manual de boas práticas e canais de suporte para médicos parceiros." />

            <Card className="dashboard-card bg-gradient-to-br from-primary/5 to-transparent border-primary/10 p-0">
                <CardContent className="text-center py-6 px-4">
                    <div className="w-11 h-11 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <LifeBuoy className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-base font-semibold text-gray-800 mb-1">Como podemos ajudar você hoje?</h2>
                    <p className="text-gray-500 max-w-md mx-auto mb-4 text-sm">
                        Consulte o manual de boas práticas abaixo ou fale com nossa equipe para dúvidas sobre agendamentos, financeiro ou uso da plataforma.
                    </p>
                    <Button asChild className="bg-primary hover:bg-primary/90 rounded-xl px-6 h-9 text-sm">
                        <Link to="/suporte">Acessar FAQ e Tutoriais <ArrowRight className="ml-1.5 w-3.5 h-3.5" /></Link>
                    </Button>
                </CardContent>
            </Card>

            {/* Manual de Boas Práticas */}
            <Card className="dashboard-card p-0 overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-blue-50/40">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0">
                        <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="dashboard-title text-lg">Manual de Boas Práticas</h2>
                        <p className="dashboard-subtitle">Guia rápido para atender com qualidade e segurança na Click Teleconsulta.</p>
                    </div>
                </div>
                <CardContent className="p-4 sm:p-5">
                    <Accordion type="single" collapsible className="w-full space-y-2">
                        {manual.map((section, i) => (
                            <AccordionItem
                                key={i}
                                value={`item-${i}`}
                                className="border border-gray-200 rounded-xl px-4 data-[state=open]:border-blue-200 data-[state=open]:bg-blue-50/30 transition-colors"
                            >
                                <AccordionTrigger className="hover:no-underline py-3.5 text-left">
                                    <span className="flex items-center gap-3">
                                        <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                                            <section.icon className="w-4 h-4" />
                                        </span>
                                        <span className="text-sm font-semibold text-gray-800">{section.title}</span>
                                    </span>
                                </AccordionTrigger>
                                <AccordionContent className="pb-4">
                                    <ul className="space-y-2 pl-1">
                                        {section.points.map((p, j) => (
                                            <li key={j} className="flex gap-2.5 text-sm text-gray-600 leading-relaxed">
                                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                                <span>{p}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>

                    <p className="text-[11px] text-gray-400 mt-4 leading-relaxed">
                        Este manual é um guia de orientação e não substitui as normas do Conselho Federal de Medicina nem a legislação vigente.
                        A responsabilidade pelos atendimentos é do médico parceiro.
                    </p>
                </CardContent>
            </Card>

            <div className="grid gap-3">
                <Card className="dashboard-card hover:border-primary/30 group cursor-pointer transition-all p-0">
                    <CardContent className="flex items-start gap-3 p-4">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Mail className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-800 mb-0.5">Suporte por E-mail</h3>
                            <p className="text-xs text-gray-500 mb-1">Para questões mais detalhadas ou envio de documentos.</p>
                            <a href="mailto:suporte@clickteleconsulta.online" className="text-xs font-medium text-primary hover:underline">suporte@clickteleconsulta.online</a>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default DoctorHelp;
