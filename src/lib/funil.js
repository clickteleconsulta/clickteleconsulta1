// Conta os passos do funil no nosso próprio banco.
//
// POR QUE
// GA4, Meta Pixel e TikTok só carregam depois do aceite do banner (ver
// src/lib/analytics.js). Está certo pela LGPD e é caro para a medição: quem
// recusa ou ignora o banner some da conta. E nenhum dos três recebia evento dos
// passos do meio — dava para saber que o funil vaza, não onde. Isto aqui
// resolve a segunda parte, e não depende de consentimento nenhum.
//
// POR QUE NÃO PEDE CONSENTIMENTO
// Não segue ninguém entre sites, não guarda dado pessoal e não sobrevive ao
// fechar da aba. Vai o nome do passo e um identificador aleatório de aba, sem
// vínculo com usuário, e-mail, CPF ou IP. É contagem agregada do uso do próprio
// serviço. NÃO acrescente nada identificável aqui: é essa fronteira que mantém
// o registro fora do regime de dado pessoal.
//
// A TABELA PODE NÃO EXISTIR
// Ela nasce em supabase/sql/eventos-funil.sql, que precisa ser rodado uma vez.
// Enquanto não for, a chamada falha e o erro é engolido de propósito: medir
// nunca pode atrapalhar quem está tentando agendar.
import { supabase } from '@/lib/customSupabaseClient';

// Os nomes precisam bater com a lista aceita por registrar_etapa_funil no SQL.
// Nome fora da lista é recusado lá e some sem aviso — por isso está aqui em
// constante, e não solto como string em cada página.
export const ETAPAS = {
  HOME: 'home',
  BUSCA: 'busca',
  BUSCA_COM_RESULTADO: 'busca_com_resultado',
  BUSCA_SEM_RESULTADO: 'busca_sem_resultado',
  VAGA_EM_2H: 'vaga_em_2h',
  PERFIL_MEDICO: 'perfil_medico',
  HORARIO_ESCOLHIDO: 'horario_escolhido',
  CADASTRO_INICIADO: 'cadastro_iniciado',
  CADASTRO_CONCLUIDO: 'cadastro_concluido',
  CHECKOUT: 'checkout',
  GUIA_CRIADA: 'guia_criada',
};

const CHAVE_SESSAO = 'cc_funil_sessao';
const CHAVE_ETAPAS = 'cc_funil_etapas';

// sessionStorage, e não localStorage, é escolha e não descuido: o id morre ao
// fechar a aba, então não vira identificador persistente de pessoa.
const armazem = () => {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null; // navegação privada com storage bloqueado
  }
};

const idSessao = () => {
  const store = armazem();
  if (!store) return null;
  let id = store.getItem(CHAVE_SESSAO);
  if (!id) {
    id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    store.setItem(CHAVE_SESSAO, id);
  }
  return id;
};

// A pergunta é "quantas sessões chegaram até o passo X", não "quantas vezes a
// tela abriu". Sem esta trava, um F5 na busca contaria como mais uma pessoa e o
// funil ficaria mais largo no meio do que no topo. Fica no sessionStorage
// porque recarregar a página zera a memória do módulo, mas não a sessão.
const jaContadas = () => {
  const store = armazem();
  if (!store) return new Set();
  try {
    return new Set(JSON.parse(store.getItem(CHAVE_ETAPAS) || '[]'));
  } catch {
    return new Set();
  }
};

/**
 * Marca que esta sessão alcançou um passo do funil. Chamada única por sessão
 * para cada passo; repetição é ignorada. Nunca lança.
 */
export async function marcarEtapa(etapa) {
  try {
    if (!Object.values(ETAPAS).includes(etapa)) return;

    const sessao = idSessao();
    if (!sessao) return;

    const vistas = jaContadas();
    if (vistas.has(etapa)) return;
    vistas.add(etapa);
    armazem()?.setItem(CHAVE_ETAPAS, JSON.stringify([...vistas]));

    await supabase.rpc('registrar_etapa_funil', { p_sessao: sessao, p_etapa: etapa });
  } catch {
    // Silêncio proposital: tabela ainda não criada, rede caída, bloqueador de
    // conteúdo. Nada disso pode aparecer para quem está agendando.
  }
}

export default marcarEtapa;
