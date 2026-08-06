#!/usr/bin/env python3
"""
Gera src/components/ui/icones.jsx a partir das fontes Uicons do Flaticon.

POR QUE NÃO INSTALAR O PACOTE @flaticon/flaticon-uicons
Ele pesa 26 MB e entrega os ícones como WEBFONT: uma família inteira, 3.567
ícones, ~248 KB de woff2 que o navegador baixa para usar os 160 que usamos. Para
um site que tem que abrir rápido no celular de quem está procurando médico, isso
é caro demais por um ganho estético.

Aqui os contornos saem da fonte e viram <path> inline, só os que o projeto usa.
Medido: ~101 bytes por ícone depois do gzip, contra ~66 do lucide. A diferença
total é de poucos KB — o traço sólido custa quase nada porque tem menos contorno
que o vazado.

POR QUE OS ARQUIVOS DA FONTE ESTÃO VERSIONADOS EM tools/uicons/
São 464 KB de entrada de build, nunca servidos ao navegador. A alternativa era
uma devDependency de 26 MB, ou depender de um download que pode sair do ar entre
uma build e outra. Guardar as duas fontes que usamos é mais barato e mais
estável. A licença cobre: assinatura Flaticon/Freepik ativa.

OS NOMES SÃO OS DO LUCIDE, DE PROPÓSITO
O módulo gerado exporta `User`, `Calendar`, `Loader2`… com os mesmos nomes que a
biblioteca antiga usava. Assim a troca em 153 arquivos é UMA linha por arquivo —
o caminho do import — e não uma reescrita de JSX, que é onde os erros aparecem.

Uso:
    python3 tools/gerar-icones.py
"""
import json
import os
import re

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTE = os.path.join(RAIZ, 'tools', 'uicons')
SAIDA = os.path.join(RAIZ, 'src', 'components', 'ui', 'icones.jsx')

# família -> (css, woff2). O prefixo da classe é o que diz de qual delas o ícone
# vem: fi-ss- é solid/straight, fi-brands- são as marcas.
FAMILIAS = {
    'fi-ss-':     ('solid-straight.css', 'solid-straight.woff2'),
    'fi-brands-': ('brands.css', 'brands.woff2'),
}


def carregar(css_arq, woff_arq):
    """Devolve {classe: path SVG} para uma família inteira."""
    css = open(os.path.join(FONTE, css_arq), encoding='utf-8').read()
    pontos = {n: int(c.replace('\\', ''), 16)
              for n, c in re.findall(r'\.(fi-[a-z0-9-]+):before\{content:"([^"]+)"\}', css)}

    fonte = TTFont(os.path.join(FONTE, woff_arq))
    cmap, glifos = fonte.getBestCmap(), fonte.getGlyphSet()
    # 300 nestas fontes. Sai do arquivo e não escrito à mão porque uma atualização
    # do Uicons que mude a métrica desalinharia TODOS os ícones de uma vez, sem
    # erro nenhum — só ficariam tortos.
    upm = fonte['head'].unitsPerEm

    saida = {}
    for classe, ponto in pontos.items():
        glifo = cmap.get(ponto)
        if not glifo:
            continue
        caneta = SVGPathPen(glifos)
        glifos[glifo].draw(caneta)
        d = caneta.getCommands()
        if d:
            saida[classe] = d
    return saida, upm


def main():
    mapa = json.load(open(os.path.join(FONTE, 'mapa.json'), encoding='utf-8'))

    paths, upm = {}, None
    for prefixo, (css_arq, woff_arq) in FAMILIAS.items():
        familia, upm_familia = carregar(css_arq, woff_arq)
        paths.update(familia)
        upm = upm or upm_familia
        assert upm == upm_familia, 'famílias com métricas diferentes desalinhariam os ícones'

    faltando = [n for n, c in mapa.items() if c not in paths]
    if faltando:
        raise SystemExit(f'sem contorno para: {", ".join(faltando)}')

    linhas = [f"  {nome}: '{paths[classe]}'," for nome, classe in sorted(mapa.items())]
    # Um `export const` por ícone, e não um objeto exportado inteiro: é isso que
    # permite ao bundler descartar o que a tela não usa. Um objeto só seria
    # sempre carregado por completo.
    exports = '\n'.join(f"export const {n} = criar('{n}', CONTORNOS.{n});" for n in sorted(mapa))
    conteudo = CABECALHO.format(upm=upm, total=len(mapa), paths='\n'.join(linhas), exports=exports)
    os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
    open(SAIDA, 'w', encoding='utf-8').write(conteudo)

    peso = os.path.getsize(SAIDA)
    print(f'  {len(mapa)} ícones -> {os.path.relpath(SAIDA, RAIZ)}  ({peso // 1024} KB)')


CABECALHO = '''/* GERADO POR tools/gerar-icones.py — NÃO EDITE À MÃO.
 *
 * Ícones Uicons (Flaticon), estilo SOLID / STRAIGHT, extraídos da fonte e
 * embutidos como contorno. Só os {total} que o projeto usa entram aqui: a fonte
 * completa traria 3.567 e ~248 KB de woff2 para o navegador baixar.
 *
 * Licença: assinatura Flaticon/Freepik ativa, que dispensa a atribuição. Se ela
 * for cancelada, é preciso creditar o Flaticon — ver docs/ILUSTRACOES-E-ICONES.md.
 *
 * OS NOMES SÃO OS DO LUCIDE de propósito, para a troca em 153 arquivos ser uma
 * linha de import por arquivo em vez de uma reescrita de JSX.
 *
 * Para acrescentar um ícone: ponha o par no mapa em tools/uicons/mapa.json e
 * rode o gerador. Os nomes disponíveis estão em tools/uicons/solid-straight.css.
 */
import {{ forwardRef }} from 'react';

import {{ cn }} from '@/lib/utils';

// A fonte desenha com o eixo Y para CIMA a partir da linha de base; o SVG desenha
// para baixo. Sem inverter, todo ícone sai de cabeça para baixo e fora da caixa.
const LADO = {upm};

const CONTORNOS = {{
{paths}
}};

/**
 * Um ícone.
 *
 * A API é a que o lucide tinha, para o resto do código não precisar saber que a
 * biblioteca mudou: `className` dimensiona (h-4 w-4), `size` funciona como
 * atalho, e a cor vem de `currentColor`.
 *
 * `strokeWidth` é aceito e IGNORADO. Estes ícones são sólidos — não existe traço
 * para engrossar. Aceitar em vez de quebrar evita ter que caçar a prop em
 * dezenas de chamadas que ainda a passam por herança do lucide.
 */
const criar = (nome, d) => {{
  const Icone = forwardRef(({{ className, size, strokeWidth: _sw, ...resto }}, ref) => (
    // `block` no className porque svg é inline por padrão e reserva o espaço da
    // linha de base embaixo — o que desalinha o ícone do texto ao lado por
    // alguns pixels, em toda a interface de uma vez.
    <svg
      ref={{ref}}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={{`0 0 ${{LADO}} ${{LADO}}`}}
      width={{size ?? 24}}
      height={{size ?? 24}}
      fill="currentColor"
      className={{cn('block shrink-0', className)}}
      aria-hidden="true"
      focusable="false"
      {{...resto}}
    >
      <g transform={{`translate(0 ${{LADO}}) scale(1 -1)`}}>
        <path d={{d}} />
      </g>
    </svg>
  ));
  Icone.displayName = nome;
  return Icone;
}};

{exports}
'''


if __name__ == '__main__':
    main()
