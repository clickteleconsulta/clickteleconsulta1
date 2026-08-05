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

  // A caixa cinza é PERSISTENTE, não só no hover. Antes o fundo só aparecia ao
  // passar o mouse — e no celular não existe hover, então os dois itens eram
  // texto solto no branco, sem nada indicando que são clicáveis.
  const CAIXA_CINZA = 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900';

  // Medidas menores na base (corpo 14, altura 40, padding e gaps curtos) para os
  // quatro elementos caberem em 360 px COM a palavra "Agendar" visível. A partir
  // de sm tudo volta ao tamanho cheio.
  const navLinkClasses = ({ isActive }) =>
    `flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 h-10 sm:h-11 rounded-md text-[14px] sm:text-[15px] font-normal transition-colors ${
      isActive ? 'bg-primary/10 text-primary font-medium' : CAIXA_CINZA
    }`;

  return (
    <>
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-border h-[var(--altura-cabecalho)] flex items-center">
        <nav className="container mx-auto px-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            {/* No mobile mostramos só o símbolo, para dar espaço ao resto */}
            <Logo className="w-10 h-10 sm:hidden group-hover:scale-105 transition-transform" />
            <Wordmark size={TAMANHOS.padrao} className="hidden sm:inline-flex group-hover:scale-105 transition-transform" />
          </Link>

          <div className="flex items-center gap-4">
              {/* O celular mostrava SÓ o ícone da agenda, sem palavra nenhuma —
                  um quadradinho que não dizia para onde levava. Agora aparece
                  "Agendar"; o "Consulta" é que fica para telas maiores.

                  Foi por espaço que o texto tinha sumido: com logo, link e as
                  duas ações, a barra estourava abaixo de ~430 px. A saída foi
                  encolher as MEDIDAS de todos no celular em vez de esconder a
                  palavra — corpo 14, altura 40, padding e gaps curtos. Medido:
                  em 360 px sobram 16 px de folga. */}
              {/* O `aria-label` cobre a faixa abaixo de 360 px, onde só resta o
                  ícone e o link ficaria sem nome nenhum. Acima disso ele
                  CONTÉM o texto visível ("Agendar"), que é o que a WCAG 2.5.3
                  exige — quem usa comando de voz consegue dizer "agendar". */}
              <NavLink to="/agendamentos" className={navLinkClasses} aria-label="Agendar Consulta" title="Agendar Consulta">
                  <CalendarDays className="w-[18px] h-[18px] shrink-0" />
                  {/* "Agendar" aparece a partir de 360 px — o que cobre todo
                      celular atual (o menor em uso é 375). Abaixo disso volta a
                      ser só o ícone, e não por preciosismo: em 320 px a barra
                      estoura mesmo com as medidas reduzidas. Como a página tem
                      `overflow-x: clip`, o excesso seria RECORTADO em silêncio —
                      o "Cadastre-se" sumiria sem nem dar para rolar até ele.
                      Melhor perder a palavra que perder o botão. */}
                  <span className="whitespace-nowrap hidden min-[360px]:inline">
                    Agendar<span className="hidden sm:inline"> Consulta</span>
                  </span>
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
                  {/* "Entrar" ganha a MESMA caixa cinza do "Agendar" ao lado.
                      Ele já foi texto solto, sem caixa — o que funcionava no
                      desktop, onde o hover denunciava que era clicável, mas no
                      celular deixava duas palavras soltas no branco sem nenhum
                      sinal de que uma delas era um botão. Com a caixa, a barra
                      passa a ter três níveis legíveis: cinza para navegar,
                      cobalto cheio para a ação principal. */}
                  <Button
                      variant="ghost"
                      onClick={() => navigate('/acesso-cliente', { state: { authMode: 'login' } })}
                      className={`text-[14px] sm:text-[15px] font-normal px-2 sm:px-3 h-10 sm:h-11 shrink-0 ${CAIXA_CINZA}`}
                  >
                      Entrar
                  </Button>
                  <Button
                      onClick={() => navigate('/acesso-cliente', { state: { authMode: 'signup' } })}
                      className="text-[14px] sm:text-[15px] font-semibold bg-primary hover:bg-primary/90 rounded-md px-2.5 sm:px-7 h-10 sm:h-11 shrink-0"
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