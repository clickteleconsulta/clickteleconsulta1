import React, { useState } from 'react';
import Logo from '@/components/Logo';
import Wordmark, { TAMANHOS } from '@/components/Wordmark';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import { LogOut, CalendarDays, LayoutDashboard } from 'lucide-react';
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
    `flex items-center gap-2 px-4 py-2 rounded-md text-[15px] font-normal transition-all duration-200 ${
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
              {/* No celular fica só o ícone. Com o botão "Cadastre-se" no lugar
                  do antigo "Entrar", o trio logo + link + ações passou a
                  estourar a barra abaixo de ~430 px. Esconder o link inteiro
                  deixaria o celular sem caminho para a listagem, então o que sai
                  é o texto — o ícone segue clicável e nomeado para leitor de
                  tela. */}
              <NavLink to="/agendamentos" className={navLinkClasses} aria-label="Agendar Consulta" title="Agendar Consulta">
                  <CalendarDays className="w-[18px] h-[18px] shrink-0" />
                  <span className="whitespace-nowrap hidden sm:inline">Agendar Consulta</span>
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
               // Hierarquia: quem ainda não tem conta é a maioria de quem chega,
               // então "Cadastre-se" fica preenchido e "Entrar" vira só texto.
               // Dois botões com a mesma força competiriam entre si e nenhum
               // apontaria o caminho.
               <div className="flex items-center gap-1 sm:gap-2">
                  {/* Só texto: sem caixa, sem borda e sem fundo no hover. */}
                  <Button
                      variant="ghost"
                      onClick={() => navigate('/acesso-cliente', { state: { authMode: 'login' } })}
                      className="text-[15px] font-normal text-slate-600 hover:text-brand-700 hover:bg-transparent px-2 sm:px-3 h-11 shrink-0"
                  >
                      Entrar
                  </Button>
                  <Button
                      onClick={() => navigate('/acesso-cliente', { state: { authMode: 'signup' } })}
                      className="text-[15px] font-semibold bg-primary hover:bg-primary/90 rounded-md px-4 sm:px-7 h-11 shrink-0"
                  >
                      Cadastre-se
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