import React, { lazy, Suspense, useState } from 'react';
import { MessageCircle, Loader2 } from '@/components/ui/icones';

/**
 * O botão do assistente, e só ele, até alguém clicar.
 *
 * POR QUE ESTA CAMADA EXISTE
 * O AiChatWidget vinha no pacote de entrada, carregado em TODA página — 438
 * linhas com framer-motion, Card, Input e cliente do Supabase. E fazia mais que
 * pesar: buscava a base de conhecimento no banco assim que montava, uma
 * requisição por visita, para uma conversa que a maioria das pessoas nunca
 * abre.
 *
 * Agora o que carrega de início é este botão — quatro elementos, nenhuma
 * dependência além do ícone. O assistente inteiro só é baixado no primeiro
 * clique, e já aparece aberto, que é o que a pessoa pediu ao clicar.
 *
 * O botão daqui e o de dentro do widget têm as MESMAS medidas e a mesma
 * posição, então a troca não desloca nada na tela.
 */
const AiChatWidget = lazy(() => import('@/components/AiChatWidget'));

const BOTAO =
  'pointer-events-auto h-14 w-14 rounded-full shadow-lg flex items-center justify-center ' +
  'bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300';

const Moldura = ({ children }) => (
  <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 pointer-events-none">
    {children}
  </div>
);

const AssistenteFlutuante = () => {
  const [pedido, setPedido] = useState(false);

  if (pedido) {
    return (
      <Suspense
        fallback={
          <Moldura>
            <span className={BOTAO} aria-hidden="true">
              <Loader2 className="w-6 h-6 animate-spin" />
            </span>
          </Moldura>
        }
      >
        <AiChatWidget abrirDeInicio />
      </Suspense>
    );
  }

  return (
    <Moldura>
      <button
        type="button"
        onClick={() => setPedido(true)}
        aria-label="Abrir o assistente"
        aria-expanded={false}
        className={BOTAO}
      >
        <span className="relative">
          <MessageCircle className="w-7 h-7" />
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-white" />
        </span>
      </button>
    </Moldura>
  );
};

export default AssistenteFlutuante;
