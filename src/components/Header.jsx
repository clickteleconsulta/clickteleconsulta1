import React, { useState } from 'react';
import Logo from '@/components/Logo';
import Wordmark, { TAMANHOS } from '@/components/Wordmark';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import { LogOut, CalendarDays, LayoutDashboard } from '@/components/ui/icones';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { painelDoPapel } from '@/lib/painelDoPapel';
import { BRAND } from '@/config/brand';

const Header = () => {
  const { session, signOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
  };

  // Leva à área DO PAPEL de quem está logado. Antes mandava todo mundo para
  // /paciente/dashboard: médico e admin caíam em "Acesso Restrito", cuja única
  // saída era sair da conta. Na prática, quem não era paciente não conseguia
  // navegar pelo site público sem risco de ser expulso da sessão.
  const handleDashboardRedirect = () => {
    navigate(painelDoPapel(profile?.role));
  };

  /**
   * O que o botão de volta diz, e quanto peso ele tem.
   *
   * PACIENTE está no site como cliente: navegar é o que ele veio fazer, então o
   * acesso à conta é secundário e fica discreto.
   *
   * MÉDICO E ADMIN estão de passagem. Quem administra a plataforma abre a página
   * pública para conferir como ela ficou, ler um documento ou ver o próprio
   * perfil — e depois quer voltar. Para eles, voltar É a ação principal da
   * barra, então o botão ganha o preenchimento que o "Cadastre-se" tem para
   * quem é visitante. Cada público vê em destaque a coisa que de fato vai fazer.
   *
   * O rótulo também muda: "Minha conta" não diz nada a quem tem um painel de
   * trabalho do outro lado.
   */
  const VOLTA = {
    medico: { rotulo: 'Meu painel', destaque: true },
    admin: { rotulo: 'Painel admin', destaque: true },
    paciente: { rotulo: 'Minha conta', destaque: false },
  };
  const volta = VOLTA[profile?.role] || VOLTA.paciente;

  // A caixa cinza é PERSISTENTE, não só no hover. Antes o fundo só aparecia ao
  // passar o mouse — e no celular não existe hover, então os dois itens eram
  // texto solto no branco, sem nada indicando que são clicáveis.
  // 40 px de altura em TODAS as larguras, e não 44 no desktop como era antes.
// 40 é o PISO, não uma escolha estética: é o menor alvo de toque que ainda se
// acerta com o dedo sem errar o vizinho. Descer mais pouparia altura na barra e
// cobraria isso de quem usa no celular. (O zoom global de 110% que já
// multiplicou estes valores foi removido — hoje 40 é 40 na tela.)
//
// Os dois <Button> levam `py-0` junto. A variante padrão do componente traz
// `h-9 px-4 py-2`; o tailwind-merge tira o h-9 quando passamos h-10, mas o
// `py-2` FICA, e aquele padding sobrevivente empurrava os botões para 44 px de
// altura enquanto os links de navegação ficavam em 40 — 4 px de diferença
// dentro da mesma barra, visível no alinhamento. Medido: com py-0 os três
// controles rendem 44 px na tela, iguais.
const CAIXA_CINZA = 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900';

  // Medidas menores na base (corpo 14, altura 40, padding e gaps curtos) para os
  // quatro elementos caberem em 360 px COM a palavra "Agendar" visível. A partir
  // de sm tudo volta ao tamanho cheio.
  const navLinkClasses = ({ isActive }) =>
    `flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 h-10 rounded-md text-[14px] sm:text-[15px] font-normal transition-colors ${
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
                {/* O rótulo aparece a partir de 360px, e não de sm: no celular
                    o ícone sozinho não distingue "minha conta" de "meu painel",
                    e é justamente no celular que o médico usa isto de passagem.
                    O aria-label e o title carregam o texto nas larguras em que
                    ele não cabe. */}
                <Button
                  size="sm"
                  variant={volta.destaque ? 'default' : 'ghost'}
                  onClick={handleDashboardRedirect}
                  aria-label={volta.rotulo}
                  title={volta.rotulo}
                  className={`flex items-center gap-2 text-[15px] px-2 sm:px-3 h-10 py-0 shrink-0 ${
                    volta.destaque
                      ? 'font-semibold bg-primary hover:bg-primary/90 text-white'
                      : 'font-normal text-gray-600 hover:text-primary hover:bg-primary/5'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  {/* nowrap porque "Meu painel" quebrava em duas linhas no
                      celular e estourava a altura do botão. */}
                  <span className="hidden min-[360px]:inline whitespace-nowrap">{volta.rotulo}</span>
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
                      className={`text-[14px] sm:text-[15px] font-normal px-2 sm:px-3 h-10 py-0 shrink-0 ${CAIXA_CINZA}`}
                  >
                      Entrar
                  </Button>
                  <Button
                      onClick={() => navigate('/acesso-cliente', { state: { authMode: 'signup' } })}
                      className="text-[14px] sm:text-[15px] font-semibold bg-primary hover:bg-primary/90 rounded-md px-2.5 sm:px-7 h-10 py-0 shrink-0"
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