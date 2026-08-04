import React, { useState } from 'react';
import Logo from '@/components/Logo';
import Wordmark, { TAMANHOS } from '@/components/Wordmark';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import { LogOut, CalendarDays, LayoutDashboard, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { BRAND } from '@/config/brand';

const Header = () => {
  const { session, signOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
  };

  const handleDashboardRedirect = () => {
    navigate('/paciente/dashboard');
  };

  const navLinkClasses = ({ isActive }) =>
    `flex items-center gap-2 px-4 py-2 rounded-full text-[15px] font-normal transition-all duration-200 ${
      isActive
        ? 'bg-primary/10 text-primary font-medium'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;

  return (
    <>
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-border h-[88px] flex items-center">
        <nav className="container mx-auto px-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            {/* No mobile mostramos só o símbolo, para dar espaço ao botão do meio */}
            <Logo className="w-12 h-12 sm:hidden group-hover:scale-105 transition-transform" />
            <Wordmark size={TAMANHOS.padrao} className="hidden sm:inline-flex group-hover:scale-105 transition-transform" />
          </Link>

          <div className="flex items-center gap-4">
              <NavLink to="/agendamentos" className={navLinkClasses}>
                  <CalendarDays className="w-[18px] h-[18px] shrink-0" />
                  <span className="whitespace-nowrap">Agendar Consulta</span>
              </NavLink>
          </div>

          <div className="flex items-center gap-3">
            {session ? (
              <>
                <Button variant="ghost" size="sm" onClick={handleDashboardRedirect} aria-label="Minha conta" title="Minha conta" className="flex items-center gap-2 text-[15px] font-normal text-gray-600 hover:text-primary hover:bg-primary/5 px-2 sm:px-3 h-10 shrink-0">
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Minha conta</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSignOut} aria-label="Sair da conta" title="Sair da conta" className="text-gray-500 hover:text-red-600 hover:bg-red-50">
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
               <div className="flex items-center gap-2">
                  <Button onClick={() => navigate('/acesso-cliente')} className="text-[15px] font-normal bg-primary hover:bg-primary/90 rounded-full px-5 sm:px-7 h-11 shrink-0">
                      <User className="w-[18px] h-[18px] mr-2" />
                      Entrar
                  </Button>
              </div>
            )}
          </div>
        </nav>
      </header>
    </>
  );
};

export default Header;