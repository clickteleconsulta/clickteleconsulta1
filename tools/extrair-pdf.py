#!/usr/bin/env python3
"""
Extrai o texto dos PDFs legais vigentes preservando a divisão de parágrafos.

POR QUE PELA GEOMETRIA, E NÃO PELO TEXTO
A primeira versão adivinhava onde um parágrafo começava a partir do que estava
escrito ("linha que começa com 1.2 abre parágrafo"). Isso errou feio: no Termo de
Adesão, os considerandos numerados em algarismo romano — I, II, III, IV — não
casavam com nenhum padrão, e o documento inteiro abria com um parágrafo gigante
onde o original tinha sete.

O PDF já sabe a resposta. Dentro de um parágrafo, o espaçamento entre linhas é
constante (15,7 pt nestes documentos); num parágrafo novo ele salta (21 pt ou
mais). Medir isso acerta sempre, e não depende de reconhecer a forma de
numeração que o redator escolheu.

Uso:
    python3 tools/extrair-pdf.py <pdf> <destino.txt>
"""
import sys
import re
import statistics

import fitz


def extrair(caminho):
    doc = fitz.open(caminho)
    paragrafos, atual = [], []
    alturas = []

    # Primeira passada só para descobrir qual é o espaçamento NORMAL deste
    # documento. Fixar 15,7 no código quebraria no dia em que alguém gerar o
    # PDF com outro corpo de texto.
    for pagina in doc:
        anterior = None
        for linha in _linhas(pagina):
            if anterior is not None:
                alturas.append(round(linha[0] - anterior, 1))
            anterior = linha[0]
    normal = statistics.median([a for a in alturas if 0 < a < 40]) if alturas else 15.7
    limite = normal * 1.25

    for pagina in doc:
        anterior = None
        for topo, texto in _linhas(pagina):
            quebra = False
            if anterior is None:
                # VIRADA DE PÁGINA. Não é quebra de parágrafo por si só — a
                # frase costuma continuar —, mas também não é continuação
                # automática: a versão que emendava sempre colou os títulos
                # "6. FINALIDADES" e "9. TRANSFERÊNCIA", que começam no topo de
                # uma página, no fim do parágrafo anterior, e as duas seções
                # sumiram do documento. Aqui a decisão é pelo texto: se a linha
                # anterior fechou frase, ou se esta começa como título ou item,
                # é parágrafo novo.
                quebra = bool(atual) and (
                    atual[-1].rstrip().endswith(('.', ';', ':', '!', '?'))
                    or _abre_bloco(texto))
            elif (topo - anterior) > limite:
                quebra = True

            if quebra and atual:
                paragrafos.append(' '.join(atual))
                atual = []
            atual.append(texto)
            anterior = topo
        anterior = None
    if atual:
        paragrafos.append(' '.join(atual))
    return '\n\n'.join(paragrafos)


def _abre_bloco(texto):
    """A linha parece começar um título de seção ou um item numerado?"""
    return bool(re.match(r'^(\d{1,2}[.)]\s|[IVXLC]+\s*—|\([a-z]\)|[a-z]\)\s)', texto)) \
        or texto[:1].isupper() and texto.isupper()


def _linhas(pagina):
    """Linhas da página, de cima para baixo e da esquerda para a direita.

    O X importa: sem ele, duas células lado a lado saem em ordem alfabética, e o
    cabeçalho da tabela de finalidades vinha como "Base legal (LGPD) Finalidade",
    com as colunas trocadas.

    O corte de 46 pt no rodapé é geométrico, e não por texto: recortar pelo
    conteúdo já apagou, numa versão anterior, o endereço da sede que aparece
    também no corpo do documento.
    """
    limite_rodape = pagina.rect.y1 - 46
    fora = []
    for bloco in pagina.get_text('dict')['blocks']:
        for linha in bloco.get('lines', []):
            texto = ''.join(s['text'] for s in linha['spans']).strip()
            topo, esquerda = linha['bbox'][1], linha['bbox'][0]
            if texto and topo < limite_rodape:
                fora.append((topo, esquerda, texto))
    fora.sort(key=lambda t: (round(t[0], 1), t[1]))
    return [(topo, texto) for topo, _, texto in fora]


if __name__ == '__main__':
    origem, destino = sys.argv[1], sys.argv[2]
    texto = extrair(origem)
    open(destino, 'w', encoding='utf-8').write(texto)
    print(f'  {destino}: {texto.count(chr(10)+chr(10)) + 1} parágrafos')
