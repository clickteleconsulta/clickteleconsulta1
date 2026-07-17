import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { 
  LayoutDashboard, 
  Users, 
  LogOut, 
  Menu,
  X,
  Bot,
  CreditCard,
  Banknote,
  FileText,
  Star,
  AlertTriangle,
  ShieldCheck,
  FolderCheck,
  User,
  LineChart,
  RotateCcw,
  SlidersHorizontal,
  Megaphone,
  ScrollText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useAdminPendingCounts } from '@/hooks/useAdminPendingCounts';

const AdminLayout = () => {
    const { signOut, profile } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    // Recarrega os contadores a cada troca de rota (após o admin processar algo).
    const { counts } = useAdminPendingCounts(location.pathname);

    // Enforce 2FA: se a conta exige aal2 e está em aal1 (2FA não concluído), volta ao login
    useEffect(() => {
        supabase.auth.mfa.getAuthenticatorAssuranceLevel()
            .then(({ data }) => {
                if (data && data.nextLevel === 'aal2' && data.currentLevel === 'aal1') {
                    supabase.auth.signOut().finally(() => navigate('/acesso-administrador'));
                }
            })
            .catch(() => {});
    }, [navigate]);

    const handleSignOut = async () => {
        await signOut();
        navigate('/acesso-administrador');
    };

    const navSections = [
        { title: 'Visão geral', items: [
            { href: '/admin/dashboard/estrategia', label: 'Painel de Administrador', icon: LineChart },
        ]},
        { title: 'Operação', items: [
            { href: '/admin/dashboard/agendamentos', label: 'Agendamentos', icon: LayoutDashboard },
            { href: '/admin/dashboard/profissionais', label: 'Profissionais', icon: Users, badge: counts.documentos },
            { href: '/admin/dashboard/pacientes', label: 'Pacientes', icon: User },
            { href: '/admin/avaliacoes', label: 'Avaliações', icon: AlertTriangle, badge: counts.denuncias, urgent: true },
            { href: '/admin/dashboard/comunicados', label: 'Comunicados', icon: Megaphone },
        ]},
        { title: 'Financeiro', items: [
            { href: '/admin/dashboard/saques-pagamentos', label: 'Saques e Pagamentos', icon: Banknote, badge: counts.saques },
            { href: '/admin/dashboard/reembolsos', label: 'Reembolsos', icon: RotateCcw, badge: counts.reembolsos },
        ]},
        { title: 'Sistema', items: [
            { href: '/admin/dashboard/auditoria', label: 'Auditoria', icon: ScrollText },
            { href: '/admin/dashboard/configuracoes', label: 'Configurações', icon: SlidersHorizontal },
        ]},
    ];

    return (
        <div className="flex min-h-screen bg-gray-50/50">
            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside 
                className={`
                    fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 
                    transform transition-transform duration-200 ease-in-out
                    ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}
            >
                <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Administração</h1>
                            <p className="text-xs text-gray-500">Painel de Controle</p>
                        </div>
                        <button 
                            className="md:hidden text-gray-500"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                {profile?.full_name?.charAt(0) || 'A'}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {profile?.full_name || 'Administrador'}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                    {profile?.email}
                                </p>
                            </div>
                        </div>
                    </div>

                    <nav className="flex-1 p-4 space-y-5 overflow-y-auto">
                        {navSections.map((section) => (
                            <div key={section.title} className="space-y-1">
                                <p className="px-4 mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">{section.title}</p>
                                {section.items.map((item) => {
                                    const isActive = location.pathname.startsWith(item.href);
                                    return (
                                        <Link
                                            key={item.href}
                                            to={item.href}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className={`
                                                flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                                                ${isActive
                                                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                                                    : 'text-gray-600 hover:bg-gray-50 hover:text-primary'
                                                }
                                            `}
                                        >
                                            <item.icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-primary'}`} />
                                            <span className="flex-1">{item.label}</span>
                                            {item.badge > 0 && (
                                                <span className={`
                                                    inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold leading-none
                                                    ${isActive
                                                        ? 'bg-white text-primary'
                                                        : item.urgent
                                                            ? 'bg-red-500 text-white'
                                                            : 'bg-primary/10 text-primary'}
                                                `}>
                                                    {item.badge > 99 ? '99+' : item.badge}
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        ))}
                    </nav>

                    <div className="p-4 border-t border-gray-100">
                        <Button 
                            variant="ghost" 
                            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 gap-3"
                            onClick={handleSignOut}
                        >
                            <LogOut className="h-4 w-4" />
                            Sair do Sistema
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Header */}
                <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200">
                    <span className="font-semibold text-gray-900">Menu</span>
                    <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
                        <Menu className="h-6 w-6" />
                    </Button>
                </div>

                <div className="flex-1 overflow-auto p-4 md:p-8">
                    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;