import React from 'react';
import { Video } from '@/components/ui/icones';
import { cn } from '@/lib/utils';

/**
 * Selo de modalidade do atendimento.
 *
 * Usa o cobalto da marca, não o verde: verde na interface significa sucesso
 * ("pagamento confirmado", "agendado"), e a modalidade não é um status — é uma
 * característica do atendimento. Antes este selo era verde e parecia um aviso
 * de confirmação.
 *
 * A palavra vem sempre daqui. Se um dia a plataforma passar a listar outra
 * modalidade, este é o único lugar a mexer.
 *
 * - `size="sm"` para dentro de cartões em lista; `"md"` para páginas de perfil.
 * - o canto é `rounded-md` (2px), alinhado ao traço seco do resto da interface.
 * - `subtle` tira a pílula e deixa só ícone e texto em cobalto, para quando o
 *   selo entra como o valor de uma coluna ao lado de outros dados e o
 *   preenchimento o faria pesar mais que os vizinhos.
 */
const TAMANHOS = {
  sm: { caixa: 'h-6 px-2 gap-1 text-[11.5px]', icone: 'w-3.5 h-3.5' },
  md: { caixa: 'h-7 px-2.5 gap-1.5 text-[13px]', icone: 'w-4 h-4' },
};

export function TeleconsultaBadge({ size = 'sm', subtle = false, className = '' }) {
  const t = TAMANHOS[size] || TAMANHOS.sm;

  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold leading-none whitespace-nowrap rounded-md',
        t.caixa,
        subtle
          ? 'text-brand-700 px-0 h-auto'
          : 'bg-brand-50 text-brand-700 border border-brand-100',
        className
      )}
    >
      <Video className={cn(t.icone, 'shrink-0 text-brand-500')} aria-hidden="true" />
      Teleconsulta
    </span>
  );
}

export default TeleconsultaBadge;
