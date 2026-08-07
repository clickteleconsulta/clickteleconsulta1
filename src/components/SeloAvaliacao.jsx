import React from 'react';
import { CheckCircle2, MessageCircle } from '@/components/ui/icones';

/**
 * O que a plataforma conferiu naquela avaliação — dito nas nossas palavras.
 *
 * SÃO DOIS NÍVEIS PORQUE SÃO DUAS COISAS DIFERENTES
 * Numa avaliação que nasceu de um agendamento, a plataforma sabe que houve
 * consulta e que ela foi paga: o vínculo está no banco. Numa avaliação escrita
 * pelo formulário aberto, a única coisa conferida é que existe um telefone real
 * que respondeu a um código — o atendimento pode ter acontecido no consultório,
 * e não temos como saber.
 *
 * Cada selo diz exatamente isso, e nada além. A tentação aqui é usar a mesma
 * palavra "verificado" nos dois, que é o que apaga a diferença justamente onde
 * ela importa: quem lê está decidindo em quem confiar.
 *
 * O selo mais forte é o único com cor. Dois selos coloridos lado a lado
 * competiriam, e o olho pararia de distinguir qual vale mais.
 */
const SeloAvaliacao = ({ origem, className = '' }) => {
  const forte = origem !== 'aberta';

  const Icone = forte ? CheckCircle2 : MessageCircle;
  const rotulo = forte ? 'Consulta confirmada pela aviDoc' : 'Telefone confirmado';
  const explicacao = forte
    ? 'Esta consulta foi agendada e paga pela plataforma, e o profissional registrou o atendimento.'
    : 'Quem escreveu confirmou um telefone por código. A consulta pode ter sido realizada fora da plataforma.';

  return (
    <span
      title={explicacao}
      className={`inline-flex items-center gap-1 text-[11px] font-medium ${
        forte ? 'text-green-700' : 'text-muted-foreground'
      } ${className}`}
    >
      <Icone className="w-3 h-3 shrink-0" aria-hidden="true" />
      {rotulo}
      <span className="sr-only">. {explicacao}</span>
    </span>
  );
};

export default SeloAvaliacao;
