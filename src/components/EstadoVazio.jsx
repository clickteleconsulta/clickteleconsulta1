/**
 * A tela quando ainda não há nada nela.
 *
 * POR QUE UM COMPONENTE, E NÃO A MARCAÇÃO REPETIDA
 * Estado vazio estava escrito à mão em cada tela, e cada uma tinha inventado o
 * seu: ícone cinza em tamanho diferente, título em peso diferente, umas com
 * botão de saída e outras sem. Junto, isso lê como sistema montado por pessoas
 * que não conversaram entre si — que é exatamente a impressão que um marketplace
 * novo não pode dar.
 *
 * ÍCONE CINZA GRANDE PARECE TELA QUEBRADA. É o mesmo desenho de um erro, no
 * mesmo tom de "algo deu errado". Ilustração muda a leitura: a tela não falhou,
 * ela está esperando você fazer a primeira coisa. Por isso o `arte` é o caminho
 * normal e o `icone` só existe para os cantos onde não há altura para um desenho.
 *
 * A ilustração é DECORATIVA (`alt=""` + `aria-hidden`): tudo que ela diz está
 * escrito no título e na descrição logo abaixo. Descrevê-la de novo só faria o
 * leitor de tela repetir a mesma informação duas vezes.
 */
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Props:
//   arte      caminho da ilustração em /ilustra — preferir sempre que couber
//   icone     componente do lucide; só para espaços baixos demais para arte
//   titulo    obrigatório
//   descricao opcional
//   acao      texto do botão; sem `onAcao` junto, o botão não aparece
//   compacto  versão para dentro de cartão ou coluna estreita
const EstadoVazio = ({
  arte,
  icone: Icone,
  titulo,
  descricao,
  acao,
  onAcao,
  className,
  compacto = false,
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center text-center',
      compacto ? 'px-4 py-8' : 'px-6 py-12',
      className,
    )}
  >
    {arte ? (
      <img
        src={arte}
        alt=""
        aria-hidden="true"
        // A largura é fixa e a altura livre porque as artes do Storyset não têm
        // todas a mesma proporção; travar as duas amassaria umas e esticaria
        // outras.
        className={cn(
          'w-auto select-none pointer-events-none',
          compacto ? 'h-24' : 'h-36 sm:h-44',
        )}
      />
    ) : (
      Icone && <Icone className={cn('text-slate-300', compacto ? 'h-8 w-8' : 'h-10 w-10')} />
    )}

    <h3 className={cn('font-semibold text-slate-900', compacto ? 'mt-4 text-sm' : 'mt-6 text-base')}>
      {titulo}
    </h3>

    {descricao && (
      // max-w-sm: linha comprida demais num bloco centralizado obriga o olho a
      // procurar o começo da linha seguinte, e ninguém faz esse esforço por um
      // texto que só explica que a lista está vazia.
      <p className={cn('text-slate-500 max-w-sm', compacto ? 'mt-1 text-xs' : 'mt-2 text-sm')}>
        {descricao}
      </p>
    )}

    {acao && onAcao && (
      <Button variant="outline" onClick={onAcao} className="mt-5">
        {acao}
      </Button>
    )}
  </div>
);

export default EstadoVazio;
