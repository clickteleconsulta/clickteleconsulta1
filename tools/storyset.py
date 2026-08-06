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
1. CAMADAS — o SVG da API vem com TODAS as camadas ligadas, inclusive o fundo
   decorativo que o editor do site deles desliga por padrão. Sem tirar, ele
   aparece como mancha cinza atrás do desenho — e o arquivo fica 5× maior.
2. COR — o acento amarelo do Storyset (#ffc727) vira o cobalto da marca, e
   depois volta a ter cor onde o objeto TEM cor no mundo real: folha verde,
   coração vermelho, estrela amarela. Carvão, cinzas e tons de pele nunca são
   tocados — são o que dá volume ao traço.

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

# ── Cor onde o objeto TEM cor no mundo real ──────────────────────────────────
#
# Tudo em cobalto ficava sem vida; tudo colorido vira arco-íris e some a marca.
# A regra que separa os dois: só ganha cor própria o que o olho já espera
# colorido — folha é verde, coração é vermelho, estrela é amarela. Monitor,
# calendário, pasta, carteira e roupa continuam cobalto, porque a cor deles no
# mundo real não é informação nenhuma.
#
# Por isso a cor entra por CAMADA, e não por busca de tom: o Storyset nomeia os
# grupos (Plant, Heart, Stars), então dá para pintar o objeto certo em vez de
# torcer para que nenhuma outra forma use o mesmo hex.
VERDE = '#0C9769'      # o jade da cruz da marca. NÃO usar o #16A34A de sucesso:
                       # verde de estado e verde de enfeite têm que ser distintos.
VERMELHO = '#E0483E'   # um tom mais quente que o vermelho de erro (#DC2626), pela
                       # mesma razão — coração desenhado não é alerta.
AMBAR = '#FBBF24'      # o mesmo amber-400 das estrelas de avaliação na interface:
                       # a estrela desenhada e a estrela clicável combinam.

CORES_POR_CAMADA = {
    'Plant': VERDE, 'Plants': VERDE, 'Trees': VERDE,
    'Heart': VERMELHO,
    'Stars': AMBAR,
}

# Camadas cujo nome não diz a cor, arquivo a arquivo. O valor é a cor, ou
# (cor, tag) quando só um tipo de forma dentro da camada deve mudar.
CORES_EXTRA = {
    # Os cartões de avaliação: o acento dentro deles são as estrelas preenchidas.
    'secao-avaliacoes.svg': {'Reviews': AMBAR},

    # A estrela grande que o personagem carrega ficou dentro do grupo DELE, e não
    # em 'Stars' — se pintasse o grupo inteiro, o tênis ia junto. Ela é o único
    # <polygon> ali; o resto do acento são <path>. Sem esse recorte a peça ficava
    # com uma estrela azul cercada de estrelinhas amarelas.
    'sem-avaliacoes.svg': {'character-1': (AMBAR, 'polygon')},
}

# Ficam inteiramente em cobalto, mesmo que tenham camada colorível.
#
# O herói é a primeira coisa que a pessoa vê e a mesma arte da peça de anúncio
# principal. Ali a marca precisa falar sozinha, sem concorrência de cor.
SEM_COR = {'heroi.svg'}

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


def _span(svg, id_grupo):
    """Onde <g id="X"> começa, onde o conteúdo começa e onde o </g> dele fecha.

    Regex sozinha não serve: o primeiro </g> que ela encontra costuma fechar um
    grupo interno, e usá-lo leva metade do desenho junto. O contador abaixo é o
    que faz o fechamento certo ser encontrado.
    """
    abertura = re.search(rf'<g[^>]*\bid="{re.escape(id_grupo)}"[^>]*>', svg)
    if not abertura:
        return None
    nivel = 1
    for tag in re.finditer(r'<g\b[^>]*>|</g>', svg[abertura.end():]):
        nivel += 1 if tag.group().startswith('<g') else -1
        if nivel == 0:
            return abertura.start(), abertura.end(), abertura.end() + tag.end()
    return abertura.start(), abertura.end(), len(svg)


def remover_grupo(svg, id_grupo):
    """Tira a camada inteira do desenho."""
    lugar = _span(svg, id_grupo)
    if not lugar:
        return svg, False
    inicio, _, fim = lugar
    return svg[:inicio] + svg[fim:], True


def pintar_grupo(svg, id_grupo, cor, so_tag=None):
    """Troca o acento da marca por `cor`, só DENTRO da camada.

    `so_tag` restringe a troca a um tipo de forma (`polygon`, `circle`…), para
    quando a camada mistura o objeto que deve ganhar cor com outros que não.

    Devolve também quantas formas mudaram: zero é sinal de que a camada existe
    mas não tem acento nenhum — a planta é toda carvão, por exemplo — e nesse
    caso não adianta insistir, o desenho já está do jeito que o autor quis.
    """
    lugar = _span(svg, id_grupo)
    if not lugar:
        return svg, 0
    _, corpo, fim = lugar
    bloco = svg[corpo:fim]

    if so_tag:
        alvo = re.compile(rf'<{so_tag}\b[^>]*?>')
        def trocar(m):
            return re.sub(re.escape(COBALTO_MARCA), cor, m.group(0), flags=re.I)
    else:
        alvo = re.compile(re.escape(COBALTO_MARCA), re.I)
        def trocar(_m):
            return cor

    novo_bloco, _ = alvo.subn(trocar, bloco)
    quantas = len(re.findall(re.escape(COBALTO_MARCA), bloco, flags=re.I)) \
        - len(re.findall(re.escape(COBALTO_MARCA), novo_bloco, flags=re.I))
    if not quantas:
        return svg, 0
    return svg[:corpo] + novo_bloco + svg[fim:], quantas


def preparar(nome, slug):
    """Baixa o SVG do Storyset e devolve já recolorido e sem as camadas de fundo."""
    dados = json.load(urllib.request.urlopen(API.format(slug=slug), timeout=30))['data']
    svg = urllib.request.urlopen(dados['src'], timeout=30).read().decode('utf-8')
    bruto = len(svg)

    svg = re.sub(re.escape(AMARELO_STORYSET), COBALTO_MARCA, svg, flags=re.I)
    for id_grupo in FUNDO + SOBRA.get(nome, []):
        svg, _ = remover_grupo(svg, id_grupo)

    # A limpeza vem ANTES da pintura de propósito: pintar primeiro gastaria
    # trabalho em camada que vai ser jogada fora, e o fundo decorativo tem folha
    # também — folha que sairia verde num desenho onde ela nem aparece.
    pintadas = {}
    if nome not in SEM_COR:
        regras = {**CORES_POR_CAMADA, **CORES_EXTRA.get(nome, {})}
        for id_grupo, regra in regras.items():
            cor, so_tag = regra if isinstance(regra, tuple) else (regra, None)
            svg, quantas = pintar_grupo(svg, id_grupo, cor, so_tag)
            if quantas:
                pintadas[id_grupo] = quantas
    return svg, bruto, pintadas


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
            svg, bruto, pintadas = preparar(nome, slug)
            open(os.path.join(pasta, nome), 'w', encoding='utf-8').write(svg)
            cor = ', '.join(f'{k}×{v}' for k, v in pintadas.items()) or ('cobalto' if nome in SEM_COR else '—')
            return f'  {nome:<26} {len(svg) // 1024:>3} KB (de {bruto // 1024:>3})  {cor}'
        except Exception as erro:                                    # noqa: BLE001
            return f'  {nome:<26} FALHOU: {erro}'

    with ThreadPoolExecutor(8) as executor:
        for linha in executor.map(uma, pendentes):
            print(linha)


if __name__ == '__main__':
    main(tudo='--tudo' in sys.argv)
