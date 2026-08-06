// Manda para algum lugar o erro que quebrou a tela de alguém.
//
// POR QUE
// O ErrorBoundary já evitava a tela branca, mas o registro era um
// `console.error` — que morre no navegador da pessoa. Se um paciente tomasse
// erro no meio do agendamento, ninguém ficava sabendo: a falha só apareceria se
// ele escrevesse para o suporte, e a maioria não escreve, desiste.
//
// O QUE NÃO VAI JUNTO
// Nada que identifique quem é. Sem id de usuário, sem e-mail, sem sessão. Vão a
// mensagem, um pedaço da pilha, a rota e o navegador — o bastante para
// reproduzir. Isso mantém o registro fora do alcance da LGPD como dado pessoal
// e evita declarar mais uma finalidade na Política de Privacidade.
//
// A TABELA PODE NÃO EXISTIR
// Ela é criada por supabase/sql/erros-cliente.sql, que precisa ser rodado uma
// vez. Enquanto não for, o insert falha e é engolido de propósito: relatar erro
// nunca pode ser motivo de erro.
import { supabase } from '@/lib/customSupabaseClient';

// Teto por sessão. Um erro dentro de um render em laço dispara centenas de
// vezes por segundo; sem trava, o primeiro bug transforma a tabela em depósito.
const TETO = 5;
const CORTE_PILHA = 2000;

let enviados = 0;
const jaVistos = new Set();

export async function relatarErro(erro, origem = 'react') {
  try {
    if (enviados >= TETO) return;

    const mensagem = String(erro?.message || erro || 'erro sem mensagem').slice(0, 500);
    const rota = typeof window !== 'undefined' ? window.location.pathname : '';

    // O mesmo erro na mesma rota é o mesmo problema. Repetir não informa nada
    // novo e só dificulta enxergar o resto.
    const chave = `${mensagem}|${rota}`;
    if (jaVistos.has(chave)) return;
    jaVistos.add(chave);
    enviados += 1;

    await supabase.from('erros_cliente').insert({
      mensagem,
      pilha: String(erro?.stack || '').slice(0, CORTE_PILHA) || null,
      rota,
      navegador: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 300) : null,
      origem,
    });
  } catch {
    // Silêncio proposital. Se o relato falhar — tabela ausente, rede caída,
    // bloqueador de anúncio — o usuário não pode ver um segundo erro por cima
    // do primeiro.
  }
}

/**
 * Erros que acontecem FORA da árvore do React — dentro de um `setTimeout`, num
 * `fetch` sem `catch`, num evento. O ErrorBoundary não enxerga nenhum deles, e
 * são justamente os que passam despercebidos porque não quebram a tela inteira.
 */
export function ligarCapturaGlobal() {
  if (typeof window === 'undefined' || window.__capturaLigada) return;
  window.__capturaLigada = true;

  window.addEventListener('error', (e) => {
    // Falha ao carregar imagem ou script vem com `target` e sem `error`: é ruído
    // de rede, não defeito de código.
    if (e?.error) relatarErro(e.error, 'window');
  });

  window.addEventListener('unhandledrejection', (e) => {
    relatarErro(e?.reason, 'promise');
  });
}

export default relatarErro;
