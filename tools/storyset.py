#!/usr/bin/env python3
"""
Baixa, recolore e limpa as ilustrações do Storyset usadas no site e nos anúncios.

POR QUE UM ARQUIVO SÓ
Antes eram dois passos separados (baixar à mão, limpar com script) e as artes do
site vinham de outra biblioteca. Duas fontes de ilustração é como o site e o
anúncio divergem: a pessoa clica num desenho e cai numa página com outro traço,
e a sensação é de ter chegado no lugar errado. Aqui está o mapa inteiro, num
lugar só.

LICENÇA
Assinatura Flaticon/Freepik ativa — a atribuição deixou de ser obrigatória.
Se a assinatura for cancelada, a obrigação volta para TODAS estas artes e é
preciso creditar o Storyset no rodapé do site. Não é detalhe: sem assinatura e
sem crédito, o uso comercial não está coberto.

O QUE É FEITO EM CADA ARQUIVO
1. COR — o acento amarelo do Storyset (#ffc727) vira o cobalto da marca.
   Carvão, cinzas e tons de pele ficam: são o que dá volume ao traço.
2. CAMADAS — o SVG da API vem com TODAS as camadas ligadas, inclusive o fundo
   decorativo que o editor do site deles desliga por padrão. Sem tirar, ele
   aparece como mancha cinza atrás do desenho — e o arquivo fica 5× maior.

Uso:
    python3 tools/storyset.py            # só o que falta
    python3 tools/storyset.py --tudo     # rebaixa tudo
"""
import json
import os
import re
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ILUSTRA = os.path.join(RAIZ, 'public', 'ilustra')
FONTES = os.path.join(RAIZ, 'public', 'marca', 'anuncios', 'fontes')

AMARELO_STORYSET = '#ffc727'
COBALTO_MARCA = '#3B5BA5'

API = 'https://stories.freepiklabs.com/api/vectors/{slug}/cuate'

# nome do arquivo -> (slug no Storyset, onde aparece)
#
# Os nomes de arquivo são os que o site já usava, de propósito: trocar a arte sem
# trocar o caminho evita mexer em 13 componentes para uma mudança que é só visual.
MAPA = {
    # ── Home e páginas públicas ───────────────────────────────────────────────
    'heroi.svg':             ('online-doctor', 'topo da home — a MESMA do anúncio de preço'),
    'secao-escolher.svg':    ('doctors',       'home: escolha o médico — a MESMA do anúncio de escolha'),
    'secao-avaliacoes.svg':  ('online-review', 'home: avaliação de quem já foi atendido'),
    'secao-documentos.svg':  ('documents',     'home: documentos com validade'),
    'quem-somos.svg':        ('team-spirit',   'página Quem somos'),
    'faq.svg':               ('questions',     'página de perguntas frequentes'),
    'suporte.svg':           ('contact-us',    'página de suporte'),
    'nao-achou.svg':         ('lost',          'página 404'),
    'cookies.svg':           ('agreement',     'banner de consentimento'),

    # ── Entrar / criar conta ──────────────────────────────────────────────────
    'acesso-cliente.svg':      ('security',                 'login do paciente'),
    'acesso-profissional.svg': ('health-professional-team', 'login do médico'),

    # ── Estados vazios ────────────────────────────────────────────────────────
    # Estado vazio com ícone cinza grande parece tela quebrada. Com desenho,
    # parece tela que está esperando você fazer algo.
    'sem-dados.svg':         ('no-data',        'lista de agendamentos vazia'),
    'sem-mensagens.svg':     ('new-message',    'conversa sem mensagens'),
    'sem-avaliacoes.svg':    ('feedback',       'nenhuma avaliação ainda'),
    'sem-financeiro.svg':    ('financial-data', 'médico sem guia de pagamento'),
    'sem-consultas.svg':     ('calendar',       'médico sem consulta na categoria'),
    'sem-documentos.svg':    ('notes',          'médico sem documento enviado'),
    'sem-procedimentos.svg': ('doctor',         'médico sem procedimento cadastrado'),
}

# Artes que existem SÓ para os anúncios e não aparecem em tela nenhuma do site.
# Ficam fora de public/ilustra para não dar a entender que a interface as usa.
#
# As outras duas peças de anúncio (preço e escolha) usam heroi.svg e
# secao-escolher.svg do mapa acima — a mesma imagem, de propósito: quem clica no
# anúncio reencontra o desenho na página inicial.
MAPA_ANUNCIOS = {
    'date-picker.svg': ('date-picker', 'anúncio "Agende em minutos"'),
    'events.svg':      ('events',      'anúncio "7 dias por semana"'),
    'wallet.svg':      ('wallet',      'anúncio "Sem convênio, sem mensalidade"'),
}

# Sai de toda ilustração: é o fundo que o editor do Storyset desliga por padrão.
FUNDO = ['background-complete', 'background-simple']

# Sai só de onde está listado, e o motivo fica junto.
SOBRA = {
    # Comprimidos sugerem venda de medicamento, que não é o que a aviDoc faz; a
    # prancheta repete o que o texto ao lado já diz.
    'heroi.svg': ['Pills', 'Clipboard'],
}


def remover_grupo(svg, id_grupo):
    """Remove <g id="X"> … </g> respeitando <g> aninhado.

    Regex sozinha não serve: o primeiro </g> que ela encontra costuma fechar um
    grupo interno, e o corte leva metade do desenho junto. O contador abaixo é o
    que faz o fechamento certo ser encontrado.
    """
    abertura = re.search(rf'<g[^>]*\bid="{re.escape(id_grupo)}"[^>]*>', svg)
    if not abertura:
        return svg, False
    fim, nivel = len(svg), 1
    for tag in re.finditer(r'<g\b[^>]*>|</g>', svg[abertura.end():]):
        nivel += 1 if tag.group().startswith('<g') else -1
        if nivel == 0:
            fim = abertura.end() + tag.end()
            break
    return svg[:abertura.start()] + svg[fim:], True


def preparar(nome, slug):
    """Baixa o SVG do Storyset e devolve já recolorido e sem as camadas de fundo."""
    dados = json.load(urllib.request.urlopen(API.format(slug=slug), timeout=30))['data']
    svg = urllib.request.urlopen(dados['src'], timeout=30).read().decode('utf-8')
    bruto = len(svg)

    svg = re.sub(re.escape(AMARELO_STORYSET), COBALTO_MARCA, svg, flags=re.I)
    for id_grupo in FUNDO + SOBRA.get(nome, []):
        svg, _ = remover_grupo(svg, id_grupo)
    return svg, bruto


def main(tudo=False):
    pendentes = []
    for mapa, pasta in ((MAPA, ILUSTRA), (MAPA_ANUNCIOS, FONTES)):
        os.makedirs(pasta, exist_ok=True)
        pendentes += [(n, s, pasta) for n, (s, _) in mapa.items()
                      if tudo or not os.path.exists(os.path.join(pasta, n))]
    if not pendentes:
        print('Nada a baixar. Use --tudo para rebaixar.')
        return

    def uma(item):
        nome, slug, pasta = item
        try:
            svg, bruto = preparar(nome, slug)
            open(os.path.join(pasta, nome), 'w', encoding='utf-8').write(svg)
            return f'  {nome:<26} {slug:<26} {bruto // 1024:>4} KB -> {len(svg) // 1024:>3} KB'
        except Exception as erro:                                    # noqa: BLE001
            return f'  {nome:<26} {slug:<26} FALHOU: {erro}'

    with ThreadPoolExecutor(8) as executor:
        for linha in executor.map(uma, pendentes):
            print(linha)


if __name__ == '__main__':
    main(tudo='--tudo' in sys.argv)
