import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
    Calendar, 
    LogOut, 
    Loader2, 
    AlertCircle, 
    Wallet, 
    HelpCircle, 
    Users, 
    MessageSquare, 
    CreditCard, 
    Settings, 
    BarChart3, 
    Clock,
    Stethoscope,
    Star,
    ChevronsLeft,
    ChevronsRight,
    LayoutDashboard
} from 'lucide-react';
import DoctorConsultations from '@/components/doctor/DoctorConsultations';
import DoctorProfile from '@/components/doctor/DoctorProfile';
import DoctorSchedule from '@/components/doctor/DoctorSchedule';
import DoctorFinance from '@/components/doctor/DoctorFinance';
import DoctorHelp from '@/components/doctor/DoctorHelp';
import DoctorSecurity from '@/components/doctor/DoctorSecurity';
import DoctorDocuments from '@/components/doctor/DoctorDocuments';
import DoctorSubscriptionPage from '@/pages/doctor/DoctorSubscriptionPage';
import PacientesListPage from '@/pages/pacientes/PacientesListPage';
import DoctorAreaHeader from '@/components/doctor/DoctorAreaHeader';
import MessagesPage from '@/pages/MessagesPage';
import DoctorReviewsPage from '@/pages/doctor/DoctorReviewsPage';
import DoctorProceduresPage from '@/pages/doctor/DoctorProceduresPage';
import { FEATURES } from '@/config/features';
import ComunicadosBanner from '@/components/ComunicadosBanner';
import DoctorOverview from '@/components/doctor/DoctorOverview';
import { useDoctorBadges } from '@/hooks/useDoctorBadges';

const DoctorArea = () => {
    const { signOut, profile, session, loading } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [doctorImageUrl, setDoctorImageUrl] = useState(null);
    const [medicoInfo, setMedicoInfo] = useState(null);
    const [expanded, setExpanded] = useState(false);
    const badges = useDoctorBadges(location.pathname);

    useEffect(() => {
        let mounted = true;
        const fetchDoctorImage = async () => {
            if (session?.user?.id) {
                const { data } = await supabase
                    .from('medicos')
                    .select('image_url, is_active, is_public')
                    .eq('user_id', session.user.id)
                    .maybeSingle();

                if (mounted && data) {
                    if (data.image_url) setDoctorImageUrl(data.image_url);
                    setMedicoInfo(data);
                }
            }
        };
        fetchDoctorImage();
        return () => { mounted = false; };
    }, [session?.user?.id]);

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    const menuItems = [
        {
            id: 'consultas',
            href: '/medico/dashboard/consultas',
            label: 'Consultas',
            icon: Calendar,
            badge: badges.hoje
        },
        {
            id: 'painel',
            href: '/medico/dashboard/painel',
            label: 'Painel',
            icon: LayoutDashboard
        },
        {
            id: 'agenda',
            href: '/medico/dashboard/agenda',
            label: 'Agenda',
            icon: Clock
        },
        {
            id: 'procedimentos',
            href: '/medico/dashboard/procedimentos',
            label: 'Procedimentos',
            icon: Stethoscope
        },
        {
            id: 'financeiro',
            href: '/medico/dashboard/financeiro',
            label: 'Financeiro',
            icon: Wallet,
            badge: badges.saque
        },
        {
            id: 'avaliacoes',
            href: '/medico/dashboard/avaliacoes',
            label: 'Avaliações',
            icon: Star,
            badge: badges.denuncias,
            urgent: true
        },
        {
            id: 'configuracoes',
            href: '/medico/dashboard/perfil',
            label: 'Configurações',
            icon: Settings
        },
        {
            id: 'ajuda',
            href: '/medico/dashboard/ajuda',
            label: 'Ajuda',
            icon: HelpCircle
        },
        {
            id: 'pacientes',
            href: '/medico/dashboard/pacientes',
            label: 'Pacientes',
            icon: Users
        },
        {
            id: 'mensagens',
            href: '/medico/dashboard/mensagens',
            label: 'Mensagens',
            icon: MessageSquare
        },
    ].filter((item) => {
        if (item.id === 'mensagens' && !FEATURES.MESSAGING) return false;
        if (item.id === 'pacientes' && !FEATURES.PRONTUARIO) return false;
        return true;
    });

    if (loading) {
        return (
            <div className="w-full h-screen flex items-center justify-center bg-gray-100">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
        );
    }
    
    if (!session) {
      return <Navigate to="/" replace />;
    }
    
    if (!profile) {
        return (
            <div className="w-full h-screen flex flex-col items-center justify-center bg-gray-100 text-center p-4">
                <AlertCircle className="w-12 h-12 text-red-500" />
                <h1 className="mt-4 text-2xl font-bold text-gray-900">Perfil não encontrado</h1>
                <p className="mt-2 text-gray-500">Não conseguimos carregar os dados do seu perfil.</p>
                <div className="mt-6 flex gap-4">
                    <Button onClick={() => window.location.reload()}>Recarregar</Button>
                    <Button variant="outline" onClick={handleSignOut}>Sair</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
            {/* Sidebar: modo reduzido (padrão) ou expandido */}
            <aside className={`${expanded ? 'w-60' : 'w-[88px]'} bg-white border-r border-gray-200 flex flex-col py-8 gap-6 z-20 flex-shrink-0 transition-all duration-300 ease-in-out`}>
                {/* Perfil + botão de expandir/recolher */}
                <div className={`flex items-center gap-3 px-4 ${expanded ? 'justify-between' : 'flex-col justify-center'}`}>
                    <div className={`flex items-center gap-3 min-w-0 ${expanded ? '' : 'flex-col'}`}>
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <div className="p-0.5 rounded-full ring-2 ring-gray-100 hover:ring-blue-100 transition-all cursor-pointer flex-shrink-0">
                                    <Avatar className="h-10 w-10 rounded-full">
                                        <AvatarImage src={doctorImageUrl} className="object-cover" />
                                        <AvatarFallback className="bg-blue-50 text-blue-600 font-bold text-sm rounded-full">
                                            {profile?.full_name?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                            </TooltipTrigger>
                            {!expanded && (
                                <TooltipContent side="right" className="font-medium bg-gray-900 text-white border-0 rounded-lg shadow-lg">
                                    <p>{profile?.full_name}</p>
                                    <p className="text-xs text-gray-400">Médico</p>
                                </TooltipContent>
                            )}
                        </Tooltip>
                        {expanded && (
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{profile?.full_name}</p>
                                <p className="text-xs text-gray-400">Médico</p>
                            </div>
                        )}
                    </div>
                    <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => setExpanded((v) => !v)}
                                aria-label={expanded ? 'Recolher menu' : 'Expandir menu'}
                                className={`flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 flex-shrink-0 ${expanded ? '' : 'mt-1'}`}
                            >
                                {expanded ? <ChevronsLeft size={18} strokeWidth={2} /> : <ChevronsRight size={18} strokeWidth={2} />}
                            </button>
                        </TooltipTrigger>
                        {!expanded && (
                            <TooltipContent side="right" className="font-medium bg-gray-900 text-white border-0 ml-3 rounded-lg shadow-xl px-3 py-1.5">
                                Expandir menu
                            </TooltipContent>
                        )}
                    </Tooltip>
                </div>

                <nav className={`flex flex-col gap-2 w-full flex-1 overflow-y-auto max-h-[calc(100vh-180px)] px-3 no-scrollbar ${expanded ? 'items-stretch' : 'items-center'}`}>
                    {menuItems.map((item) => {
                        const isActive = location.pathname.startsWith(item.href);

                        const link = (
                            <Link
                                to={item.href}
                                className={`
                                    relative flex items-center rounded-xl transition-all duration-300 group
                                    ${expanded ? 'justify-start gap-3 px-3 h-11 w-full' : 'justify-center w-12 h-12'}
                                    ${isActive
                                        ? 'text-blue-600 bg-blue-50 shadow-sm'
                                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                    }
                                `}
                            >
                                <item.icon
                                    size={22}
                                    strokeWidth={isActive ? 2 : 1.5}
                                    className={`flex-shrink-0 transition-transform duration-300 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`}
                                />
                                {expanded && (
                                    <span className="text-sm font-medium truncate flex-1">{item.label}</span>
                                )}
                                {/* Badge: pill no modo expandido, ponto no recolhido */}
                                {item.badge > 0 && (expanded ? (
                                    <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold leading-none ${item.urgent ? 'bg-red-500 text-white' : 'bg-blue-100 text-blue-700'}`}>
                                        {item.badge > 99 ? '99+' : item.badge}
                                    </span>
                                ) : (
                                    <span className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${item.urgent ? 'bg-red-500' : 'bg-blue-500'}`} />
                                ))}
                                {isActive && (
                                    <div className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 rounded-r-full" />
                                )}
                            </Link>
                        );

                        if (expanded) {
                            return <React.Fragment key={item.id}>{link}</React.Fragment>;
                        }

                        return (
                            <Tooltip key={item.id} delayDuration={0}>
                                <TooltipTrigger asChild>{link}</TooltipTrigger>
                                <TooltipContent side="right" className="font-medium bg-gray-900 text-white border-0 ml-3 rounded-lg shadow-xl px-3 py-1.5">
                                    {item.label}
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}
                </nav>

                <div className={`mt-auto pt-4 flex flex-col gap-2 w-full pb-4 px-3 ${expanded ? 'items-stretch' : 'items-center'}`}>
                    {expanded ? (
                        <button
                            onClick={handleSignOut}
                            className="flex items-center justify-start gap-3 px-3 h-11 w-full rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 group"
                        >
                            <LogOut size={20} strokeWidth={1.5} className="flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
                            <span className="text-sm font-medium">Sair da conta</span>
                        </button>
                    ) : (
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={handleSignOut}
                                    className="flex items-center justify-center w-10 h-10 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 group"
                                >
                                    <LogOut size={20} strokeWidth={1.5} className="transition-transform group-hover:translate-x-0.5" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="font-medium bg-red-600 text-white border-red-600 ml-2 rounded-lg">
                                Sair da conta
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>
            </aside>

            {/* Main content area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top navigation positioned relatively, always visible */}
                <DoctorAreaHeader />

                {/* Page content with Outlet/Routes */}
                <main className="flex-1 overflow-auto p-6 bg-gray-100">
                    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <ComunicadosBanner audience="medico" />
                        {medicoInfo && medicoInfo.is_active !== false && medicoInfo.is_public === false && (
                            <div className="mb-6 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-amber-900">Seu perfil está pausado</p>
                                    <p className="text-sm text-amber-800 mt-0.5">
                                        Envie sua documentação para análise em <strong>Configurações → Documentação</strong>. Após a aprovação pela administração, seu perfil ficará ativo e visível na página pública de agendamentos.
                                    </p>
                                    <Link to="/medico/dashboard/perfil" className="inline-block mt-2 text-sm font-medium text-amber-900 underline">
                                        Ir para Documentação
                                    </Link>
                                </div>
                            </div>
                        )}
                        <Routes>
                            <Route path="/" element={<Navigate to="consultas" replace />} />
                            <Route path="consultas" element={<DoctorConsultations />} />
                            <Route path="painel" element={<DoctorOverview />} />
                            {FEATURES.PRONTUARIO && <Route path="pacientes" element={<PacientesListPage />} />}
                            {FEATURES.MESSAGING && <Route path="mensagens" element={<MessagesPage />} />}
                            <Route path="avaliacoes" element={<DoctorReviewsPage />} />
                            <Route path="procedimentos" element={<DoctorProceduresPage />} />

                            {/* Core Features */}
                            {FEATURES.PRONTUARIO && <Route path="prescricoes" element={<DoctorDocuments />} />}
                            <Route path="perfil" element={<DoctorProfile />} />
                            <Route path="agenda" element={<DoctorSchedule />} />
                            <Route path="financeiro" element={<DoctorFinance />} />
                            <Route path="seguranca" element={<DoctorSecurity />} />
                            <Route path="ajuda" element={<DoctorHelp />} />

                            <Route path="*" element={<Navigate to="consultas" replace />} />
                        </Routes>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DoctorArea;