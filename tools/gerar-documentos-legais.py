#!/usr/bin/env python3
"""
Gera os PDFs dos documentos legais com a identidade da aviDoc.

O QUE ESTE SCRIPT FAZ, E O QUE ELE NÃO FAZ
Ele diagrama. Pega o TEXTO de um documento e devolve um PDF na marca: logo,
cobalto nos títulos, Geist no corpo, e o rodapé institucional com razão social e
CNPJ em toda página.

Ele NÃO escreve cláusula, não reescreve, não resume e não "moderniza" texto
jurídico. O conteúdo entra por arquivo e sai igual, tirando a substituição de
marca descrita abaixo — que é troca de nome, não de sentido.

POR QUE ISSO É UMA REGRA E NÃO UM ESCRÚPULO
Os documentos citam razão social e CNPJ, que NÃO mudam: a empresa continua
CLICK TELECONSULTA ONLINE LTDA. O que mudou foi o nome comercial. Trocar
cláusula junto com marca é como um ajuste visual vira problema jurídico sem
ninguém perceber.

A SUBSTITUIÇÃO DE MARCA É AUDITADA
Toda troca feita é impressa na saída, com contagem. Se aparecer uma troca que
você não esperava, o script está errado — não o documento.

ENTRADA
    documentos-legais/<slug>.md      texto do documento, em markdown simples
                                     (# título, ## seção, parágrafos, - listas)

SAÍDA
    documentos-legais/saida/<slug>.pdf

De onde vem o texto: exporte o PDF vigente (Admin → Legal) para texto e salve
como .md. O texto tem que ser o QUE JÁ VALE — este script não inventa a versão
inicial de documento nenhum.

Uso:
    python3 tools/gerar-documentos-legais.py
"""
import os
import re
import sys

from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image as PILImage
from reportlab.platypus import (BaseDocTemplate, Frame, Image, PageTemplate,
                                Paragraph, Spacer)

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTRADA = os.path.join(RAIZ, 'documentos-legais')
SAIDA = os.path.join(ENTRADA, 'saida')
LOGO = os.path.join(RAIZ, 'public', 'marca', 'logo.png')
FONTES = os.path.join(RAIZ, '.cache-fontes')

COBALTO = '#3B5BA5'
TINTA = '#151A20'
CINZA = '#5A6474'

# Dados legais. Vêm de src/config/brand.js e NÃO mudam com a marca — a empresa
# é a mesma; só o nome comercial trocou.
RAZAO_SOCIAL = 'CLICK TELECONSULTA ONLINE LTDA'
CNPJ = '68.171.336/0001-50'
ENDERECO = 'R. Antônio Pereira Ramos, nº 118, Centro, Coroaci/MG, CEP 39.710-000'

# Troca de MARCA, não de conteúdo. Cada item é nome comercial ou endereço —
# nunca cláusula, valor, prazo ou obrigação.
#
# A razão social propositalmente NÃO está aqui: "CLICK TELECONSULTA ONLINE LTDA"
# tem que sobreviver à substituição, senão o documento passa a citar uma empresa
# que não existe. Ela é protegida antes das trocas, em aplicar_marca().
#
# A ORDEM TAMBÉM É PARTE DA REGRA: domínio primeiro, nome depois.
#
# Ao contrário, a regra do nome come o domínio. Em "clickteleconsulta.online" o
# ponto conta como fronteira de palavra, então `\bClick\s*Teleconsulta\b`
# casa com o miolo e o endereço vira "aviDoc.online" — um domínio que não
# existe, dentro de um documento com efeito jurídico. Aconteceu na primeira
# versão deste script e só apareceu porque o relatório de trocas mostrou uma
# substituição a menos do que o esperado.
MARCA_ANTIGA = [
    (r'\bclickteleconsulta\.online\b', 'avidoc.com.br'),
    (r'\bclickteleconsulta\.com\.br\b', 'avidoc.com.br'),
    (r'\bwww\.avidoc\.com\.br\b', 'avidoc.com.br'),
    (r'\bClick\s*Teleconsulta\b', 'aviDoc'),
    (r'\bClickTeleConsulta\b', 'aviDoc'),
]

_MARCADOR_RAZAO = '\x00RAZAO_SOCIAL\x00'


def aplicar_marca(texto):
    """Troca o nome comercial e devolve o relatório do que mudou."""
    # A razão social sai de cena antes das trocas e volta depois. Sem isso, o
    # primeiro padrão comeria o "CLICK TELECONSULTA" de dentro dela.
    texto = texto.replace(RAZAO_SOCIAL, _MARCADOR_RAZAO)

    relatorio = []
    for padrao, novo in MARCA_ANTIGA:
        texto, n = re.subn(padrao, novo, texto, flags=re.I)
        if n:
            relatorio.append((padrao, novo, n))

    return texto.replace(_MARCADOR_RAZAO, RAZAO_SOCIAL), relatorio


def _fonte(nome, arquivo):
    caminho = os.path.join(FONTES, arquivo)
    if os.path.exists(caminho):
        pdfmetrics.registerFont(TTFont(nome, caminho))
        return nome
    return None


def estilos():
    corpo_f = _fonte('Geist', 'Geist.ttf') or 'Helvetica'
    return {
        'titulo': ParagraphStyle('titulo', fontName=corpo_f, fontSize=19, leading=24,
                                 textColor=TINTA, spaceAfter=2 * mm),
        'secao': ParagraphStyle('secao', fontName=corpo_f, fontSize=12.5, leading=17,
                                textColor=COBALTO, spaceBefore=6 * mm, spaceAfter=2 * mm),
        'corpo': ParagraphStyle('corpo', fontName=corpo_f, fontSize=9.5, leading=15,
                                textColor=TINTA, alignment=TA_JUSTIFY, spaceAfter=2.5 * mm),
        'item': ParagraphStyle('item', fontName=corpo_f, fontSize=9.5, leading=15,
                               textColor=TINTA, alignment=TA_JUSTIFY, spaceAfter=1.5 * mm,
                               leftIndent=7 * mm, bulletIndent=2 * mm,
                               bulletFontName='Helvetica', bulletFontSize=9.5),
        'meta': ParagraphStyle('meta', fontName=corpo_f, fontSize=8, leading=11,
                               textColor=CINZA, spaceAfter=5 * mm),
    }


def _inline(t):
    """Negrito e itálico do markdown para as tags que o reportlab entende.

    O escape de & < > vem ANTES, senão um "&" solto no texto — que aparece em
    razão social e em endereço — quebra o parser de tag do reportlab e derruba
    a geração inteira.
    """
    t = t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
    t = re.sub(r'(?<!\*)\*([^*]+?)\*(?!\*)', r'<i>\1</i>', t)
    return t


def montar(texto, est):
    """Markdown simples -> flowables. Deliberadamente pobre: título, seção,
    parágrafo e lista. Documento legal não precisa de mais, e cada recurso a
    mais é uma chance de o texto sair diferente do que entrou.

    PARÁGRAFO TERMINA EM LINHA EM BRANCO, não em quebra de linha. A primeira
    versão tratava cada linha como um parágrafo: um texto quebrado a 80 colunas
    — que é como sai de PDF exportado — virava uma cascata de parágrafos de uma
    linha, com espaçamento entre cada um. Ilegível, e nada parecido com o
    documento de origem.
    """
    fluxo, lista, paragrafo = [], [], []

    def fechar_paragrafo():
        if paragrafo:
            fluxo.append(Paragraph(_inline(' '.join(paragrafo)), est['corpo']))
            paragrafo.clear()

    def fechar_lista():
        # Um Paragraph com bulletText por item, e não ListFlowable: o
        # ListFlowable ignora o bulletFontName que se passa a ele, e como a
        # Geist não tem o glifo do marcador o "•" caía para um traço minúsculo e
        # alto — parecia sujeira de digitalização num documento legal. Aqui a
        # fonte do marcador vem do estilo, e o estilo manda.
        for item in lista:
            fluxo.append(Paragraph(_inline(item), est['item'], bulletText='\u2022'))
        lista.clear()

    def fechar():
        fechar_paragrafo()
        fechar_lista()

    for linha in texto.split('\n'):
        linha = linha.strip()
        if not linha:
            fechar()
        elif linha.startswith('## '):
            fechar()
            fluxo.append(Paragraph(_inline(linha[3:]), est['secao']))
        elif linha.startswith('# '):
            fechar()
            fluxo.append(Paragraph(_inline(linha[2:]), est['titulo']))
        elif linha.startswith(('- ', '* ')):
            fechar_paragrafo()
            lista.append(linha[2:])
        else:
            fechar_lista()
            paragrafo.append(linha)
    fechar()
    return fluxo


def gerar(slug, texto, versao):
    est = estilos()
    alvo = os.path.join(SAIDA, f'{slug}.pdf')
    margem = 20 * mm
    rodape_alt = 16 * mm

    def pagina(canvas, doc):
        canvas.saveState()
        # Rodapé institucional em TODA página, e não só na primeira: página
        # solta de contrato circula sozinha, e sem isso ela não identifica de
        # quem é.
        canvas.setFont(est['corpo'].fontName, 7)
        canvas.setFillColor(CINZA)
        base = margem - 6 * mm
        canvas.drawString(margem, base + 4 * mm, f'{RAZAO_SOCIAL} · CNPJ {CNPJ}')
        canvas.drawString(margem, base, ENDERECO)
        canvas.drawRightString(A4[0] - margem, base + 4 * mm, f'{versao} · página {doc.page}')
        canvas.restoreState()

    doc = BaseDocTemplate(alvo, pagesize=A4,
                          leftMargin=margem, rightMargin=margem,
                          topMargin=margem, bottomMargin=margem + rodape_alt,
                          title=slug, author=RAZAO_SOCIAL)
    doc.addPageTemplates([PageTemplate(
        id='padrao',
        frames=[Frame(margem, margem + rodape_alt, A4[0] - 2 * margem,
                      A4[1] - 2 * margem - rodape_alt, id='corpo')],
        onPage=pagina)])

    fluxo = []
    if os.path.exists(LOGO):
        # A proporção sai do arquivo e as duas medidas vão no CONSTRUTOR. Ajustar
        # drawWidth/drawHeight depois não redimensiona: o reportlab já mediu a
        # imagem, e o logo saía em tamanho natural, estourando a página.
        with PILImage.open(LOGO) as im:
            larg_px, alt_px = im.size
        larg = 32 * mm
        logo = Image(LOGO, width=larg, height=alt_px * larg / larg_px)
        logo.hAlign = 'LEFT'
        fluxo += [logo, Spacer(1, 8 * mm)]
    fluxo += montar(texto, est)
    doc.build(fluxo)
    return alvo


def main():
    if not os.path.isdir(ENTRADA):
        raise SystemExit(
            f'Crie {os.path.relpath(ENTRADA, RAIZ)}/ e coloque um .md por documento.\n'
            'O texto tem que ser o do PDF VIGENTE, exportado de Admin → Legal.\n'
            'Este script diagrama; ele não escreve documento legal.')

    fontes = sorted(f for f in os.listdir(ENTRADA) if f.endswith('.md'))
    if not fontes:
        raise SystemExit(f'Nenhum .md em {os.path.relpath(ENTRADA, RAIZ)}/.')

    os.makedirs(SAIDA, exist_ok=True)
    for arquivo in fontes:
        slug = arquivo[:-3]
        bruto = open(os.path.join(ENTRADA, arquivo), encoding='utf-8').read()

        # A versão sai de uma linha `<!-- versao: v7 -->` no topo do .md. Fica no
        # arquivo, e não no nome, porque o número da versão é conteúdo do
        # documento — quem publica precisa vê-lo dentro do PDF.
        m = re.search(r'<!--\s*versao:\s*(.+?)\s*-->', bruto)
        versao = m.group(1) if m else 'sem versão'
        bruto = re.sub(r'<!--.*?-->', '', bruto, flags=re.S)

        texto, relatorio = aplicar_marca(bruto)
        caminho = gerar(slug, texto, versao)

        print(f'  {slug:<28} {versao:<12} {os.path.getsize(caminho) // 1024:>4} KB')
        for padrao, novo, n in relatorio:
            print(f'      marca: {padrao} -> {novo}  ({n}×)')
        if not relatorio:
            print('      marca: nada a trocar')

    print(f'\n  Saída em {os.path.relpath(SAIDA, RAIZ)}/')
    print('  Publique por Admin → Legal: a tela cria versão nova e desativa a anterior.')


if __name__ == '__main__':
    main()
