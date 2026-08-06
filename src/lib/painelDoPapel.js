/**
 * Para onde cada papel vai quando pede "a minha área".
 *
 * POR QUE ISTO EXISTE
 * O mapa estava escrito em três lugares, cada um de um jeito, e só um deles
 * conhecia o admin. O do cabeçalho mandava TODO MUNDO para /paciente/dashboard,
 * inclusive médico e administrador — que chegavam lá, batiam na tela "Acesso
 * Restrito" e ficavam sem saída, porque o único botão dela era "Sair e tentar
 * com outra conta". Na prática, quem era médico ou admin não conseguia navegar
 * pelo site público: bastava um clique errado para ser expulso da sessão.
 *
 * Um lugar só, e os três passam a concordar.
 */

const PAINEL = {
  admin: '/admin/dashboard/estrategia',
  medico: '/medico/dashboard',
  paciente: '/paciente/dashboard',
};

/**
 * O painel do papel informado.
 *
 * Cai no do paciente quando o papel é desconhecido — e não numa tela de erro:
 * perfil sem papel definido é estado transitório logo depois do cadastro, e
 * mandar essa pessoa para o lugar mais provável é melhor que travá-la.
 */
export const painelDoPapel = (papel) => PAINEL[papel] || PAINEL.paciente;

export default painelDoPapel;
