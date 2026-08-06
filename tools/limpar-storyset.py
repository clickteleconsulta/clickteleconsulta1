#!/usr/bin/env python3
"""
Tira do SVG do Storyset as camadas que não devem aparecer no anúncio.

POR QUE ISSO EXISTE
O arquivo que a API do Storyset entrega vem com TODAS as camadas ligadas,
inclusive o fundo decorativo — blocos cinza e uma trama quadriculada que, no
editor do site deles, você desliga com um clique. Rasterizado como veio, esse
fundo aparece como manchas cinza atrás do desenho e faz a peça parecer suja.

Só o fundo não basta: cada ilustração tem camada que atrapalha a mensagem. Em
'online-doctor', o pote de comprimidos sugere venda de medicamento, que não é o
que a aviDoc faz. Elas estão listadas em SOBRA, uma a uma, com o motivo.

É idempotente: rodar de novo num arquivo já limpo não muda nada.

Uso:
    python3 tools/limpar-storyset.py
"""
import os
import re

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTES = os.path.join(RAIZ, 'public', 'marca', 'anuncios', 'fontes')

# Sai de toda ilustração: é o fundo que o editor do Storyset desliga por padrão.
FUNDO = ['background-complete', 'background-simple']

# Sai só de onde está listado, e o motivo fica junto.
SOBRA = {
    # Comprimidos sugerem venda de medicamento; a prancheta repete o que o
    # texto da peça já diz.
    'online-doctor.svg': ['Pills', 'Clipboard'],
}


def remover_grupo(svg, id_grupo):
    """Remove <g id="X"> ... </g> respeitando <g> aninhado.

    Regex sozinha não serve: o primeiro </g> que ela encontra costuma fechar um
    grupo interno, e o corte leva metade do desenho junto. O contador abaixo é o
    que faz o fechamento certo ser encontrado.
    """
    abertura = re.search(rf'<g[^>]*\bid="{re.escape(id_grupo)}"[^>]*>', svg)
    if not abertura:
        return svg, False
    i, nivel = abertura.end(), 1
    for tag in re.finditer(r'<g\b[^>]*>|</g>', svg[abertura.end():]):
        nivel += 1 if tag.group().startswith('<g') else -1
        if nivel == 0:
            i = abertura.end() + tag.end()
            break
    return svg[:abertura.start()] + svg[i:], True


def limpar(nome):
    caminho = os.path.join(FONTES, nome)
    svg = open(caminho, encoding='utf-8').read()
    tirados = []
    for id_grupo in FUNDO + SOBRA.get(nome, []):
        svg, saiu = remover_grupo(svg, id_grupo)
        if saiu:
            tirados.append(id_grupo)
    if tirados:
        open(caminho, 'w', encoding='utf-8').write(svg)
    return tirados


if __name__ == '__main__':
    for nome in sorted(f for f in os.listdir(FONTES) if f.endswith('.svg')):
        tirados = limpar(nome)
        print(f'  {nome:<22} {", ".join(tirados) if tirados else "nada a tirar"}')
