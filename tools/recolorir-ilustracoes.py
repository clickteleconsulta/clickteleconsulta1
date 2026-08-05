#!/usr/bin/env python3
"""
Recolore as ilustrações do unDraw para as cores da marca.

REGRA (04/08/2026): UMA arte, UM acento. Nenhuma ilustração mistura cobalto e
jade. Antes elas usavam os dois na mesma imagem — o cobalto na estrutura e o
jade em detalhes — e o resultado era uma arte com duas cores de marca brigando
dentro do mesmo desenho, sem hierarquia entre elas.

A variedade vem da ALTERNÂNCIA entre as artes, não da mistura dentro de cada
uma: parte do site em cobalto, parte em jade. Assim o site não fica monocromático
sem que nenhuma arte fique bicolor.

O jade continua PROIBIDO em interface (botão, link, ícone clicável, estado). Ser
o acento único de uma ilustração não muda isso — em ilustração ele é desenho, em
interface seria significado. Ver public/marca/LEIA-ME.txt.

Uso:
    python3 tools/recolorir-ilustracoes.py

O script é idempotente: rodar duas vezes não muda nada.
"""
import os
import re

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(RAIZ, 'public', 'ilustra')

COBALTO = '#3b5ba5'
JADE = '#0c9769'
ROXO_UNDRAW = '#6c63ff'   # o acento padrão de toda arte baixada do unDraw

# ─────────────────────────────────────────────────────────────────────────────
# O GUARDA-ROUPA (05/08/2026). Duas cores, e NENHUMA delas é cor de marca.
#
# As camisas dos personagens estavam todas em cinza, e a fileira de três
# cartões da home ficou sem vida. Colorir com cobalto ou jade não resolvia: numa
# arte cujo acento já é cobalto, a camisa cobalto some; e cor de marca em cima
# de personagem começa a competir com o significado que ela tem na interface.
#
# Por isso as roupas usam uma paleta PRÓPRIA, deliberadamente fora da marca:
#
#   TERRACOTA  quente, complementar ao cobalto. Já tinha sido escolhida para o
#              casaco do herói, e por um motivo que continua valendo: não entra
#              em nenhuma tríade institucional (o amarelo que veio antes, com o
#              jade e o cobalto ao lado, lia como bandeira do Brasil).
#   ÍNDIGO     o cobalto puxado para o ardósia. Azul de roupa, não de botão —
#              é justamente por ser mais apagado que ele não se confunde com a
#              cor de ação.
#
# Ficam FORA da regra de uma cor por arte, e de propósito: a regra existe para
# impedir que DUAS CORES DE MARCA disputem dentro do mesmo desenho. Roupa não é
# acento. Elas também não estão em ACENTOS abaixo, então a troca por cor nunca
# as alcança — camisa repintada aqui não volta atrás sozinha.
#
# A distribuição alterna para dois cartões vizinhos não vestirem igual:
#   secao-escolher     terracota  (contra as barras cobalto)
#   secao-avaliacoes   índigo     (contra o amarelo das estrelas)
#   secao-documentos   terracota  (complementar ao verde do selo)
TERRACOTA = '#d08b6c'
INDIGO    = '#5e6b8c'

# Qualquer um destes vira o acento escolhido do arquivo.
ACENTOS = {COBALTO, JADE, ROXO_UNDRAW}

# A distribuição. Cobalto nas telas de fluxo principal (é a cor institucional) e
# jade nas de conteúdo e de estado vazio, que é onde uma cor diferente dá ar de
# vida sem competir com o caminho de agendamento.
DESTINO = {
    'heroi.svg':       COBALTO,   # topo da home — o rosto do produto
    'faq.svg':         COBALTO,
    'suporte.svg':     COBALTO,
    'nao-achou.svg':   COBALTO,
    'cookies.svg':     COBALTO,   # vive dentro da barra de consentimento, que é
                                  # interface: jade ali leria como estado
    'blog.svg':        JADE,
    'quem-somos.svg':  JADE,
    'sem-dados.svg':   JADE,

    # Telas de acesso: cada público entra por uma porta de cor diferente, para a
    # pessoa saber num relance se está no lado certo. O jade aqui é ILUSTRAÇÃO,
    # não interface — segue proibido em botão, link e estado.
    #
    # 'acesso-cliente.svg' é a "Log in" do unDraw (slug login_weas, baixada em
    # 05/08/2026 de https://cdn.undraw.co/illustration/login_weas.svg). Aqui a
    # porta é literal: o personagem está entrando por uma. Ele veste o cobalto
    # de propósito, e isto é EXCEÇÃO ao guarda-roupa definido acima — nesta arte
    # a cor não é roupa, é o sinal de qual porta é a do paciente, o mesmo papel
    # que o jade cumpre na do profissional. Trocar por terracota apagaria a
    # única coisa que diferencia as duas telas de acesso à primeira vista.
    #
    # Para achar outra arte do unDraw: https://undraw.co/api/search?q=<termo>
    # devolve JSON com o campo `media`, que é o SVG direto. É GET; POST responde
    # "Method not allowed", e /api/illustrations (o endpoint antigo) dá 404.
    'acesso-cliente.svg':      COBALTO,
    'acesso-profissional.svg': JADE,

    # Seção de três cartões da home. Cada cartão tem UM acento, e os três são
    # diferentes — é a alternância que dá o respiro de cor, não a mistura.
    'secao-escolher.svg':   COBALTO,

    # Passou de cobalto para jade em 05/08/2026: a única cor que restou nela é a
    # do selo de validado — círculo VERDE com o V branco dentro, e não o
    # contrário —, e verde é o que este projeto usa para sucesso. A
    # camisa da personagem saiu do cobalto para um cinza neutro (#b3b3b3, e não
    # o #cccccc da arte ao lado, porque aqui a camisa encosta no documento
    # #e6e6e6 e os dois cinzas se dissolviam um no outro). O selo redondo do
    # documento acompanhou o tique: é o mesmo carimbo de validade, e deixá-lo
    # cobalto devolveria a arte à condição bicolor.
    'secao-documentos.svg': JADE,

    # EXCEÇÃO: 'secao-avaliacoes.svg' NÃO entra nesta tabela — ver abaixo.
}


# Artes que ficam de fora do DESTINO de propósito, e o porquê aparece na saída
# do script para ninguém "consertar" isso achando que foi esquecimento.
FORA_DA_TABELA = {
    # As estrelas, a barra de cada avaliação e a estrelinha na mão estão em
    # AMARELO #ffc100, não em cobalto nem em jade. Estrela de avaliação é
    # amarela em qualquer lugar; repintá-la com a cor da marca tiraria
    # justamente o que a imagem tem para dizer. A regra de UMA cor por arte
    # continua valendo — a cor é que é outra, e a camisa da personagem foi para
    # um cinza neutro (#cccccc) para não disputar com ela. O cinza é um passo
    # abaixo do #e6e6e6 da camisa da arte vizinha, para as duas não parecerem a
    # mesma pessoa.
    'secao-avaliacoes.svg': 'amarelo  fora da tabela DE PROPÓSITO (estrelas, ver FORA_DA_TABELA)',
}


# ─────────────────────────────────────────────────────────────────────────────
# O HERÓI TEM REPINTURA MANUAL (04/08/2026, revisto em 05/08/2026).
#
# Ele JÁ FOI exceção à regra de uma cor por arte, quando tinha folhas jade atrás
# de um calendário cobalto. As folhas saíram e a exceção morreu junto: hoje a
# arte não tem nenhuma cor de marca além do cobalto. O que sobra aqui é
# repintura manual, não exceção de cor.
#
# A repintura dele não cabe na troca por cor porque UM MESMO hex (#f2f2f2)
# pintava as folhas E os slots vazios do calendário. Trocar por cor mexeria nos
# dois juntos; aqui cada elemento é encontrado pelo início do seu `d`.
#
# A hierarquia dos slots é o que a imagem precisa comunicar:
#   escolhido pelo personagem  cobalto cheio + tique  — o mais forte
#   disponível, em destaque    brand-50, SEM tique    — igual aos slots do site
#   vazio                      azul acinzentado       — presente, mas recuado
# Antes os vazios eram #f2f2f2 sobre um fundo quase do mesmo tom, e sumiam.
#
# O tique do slot em destaque foi REMOVIDO do arquivo (04/08/2026): um selo de
# confirmado num horário que o personagem não escolheu contradizia a cena. A
# remoção está no próprio SVG, com comentário no lugar — não é recoloração, e
# por isso não aparece na tabela abaixo. Se a arte for baixada de novo do
# unDraw, esse tique volta e precisa sair outra vez.
HEROI = {
    # As três folhas de fundo, que eram jade, foram REMOVIDAS do arquivo em
    # 05/08/2026 — não repintadas, apagadas. Planta atrás de um calendário de
    # agendamento não dizia nada, e era só ela que obrigava esta arte a usar
    # duas cores de marca ao mesmo tempo.
    # slots vazios
    'M591.261,605.191':  '#cfd9ea',
    'M388.473,605.191':  '#cfd9ea',
    'M793.66,605.191':   '#cfd9ea',
    'M793.66,460.013':   '#cfd9ea',
    # O slot da esquerda — o que o personagem NÃO está escolhendo (verificado
    # pintando os dois e olhando para onde o dedo aponta). Fica do mesmo tom dos
    # vazios: quem o diferencia é o traço de OCUPADO desenhado por cima, não a
    # cor. Antes ele era brand-50, quase branco, e saltava mais que o horário
    # escolhido — hierarquia invertida.
    'M388.773,459.72':   '#cfd9ea',

    # Casaco e manga em TERRACOTA. O cinza original sumia contra o azul do
    # banner. O amarelo que veio antes resolvia isso mas criava outro problema:
    # amarelo + o jade das folhas + o cobalto do calendário liam como bandeira
    # do Brasil. A terracota é quente igual, complementar ao cobalto, e não
    # entra em nenhuma tríade institucional. A LINHA DE CHÃO (M906.378) fica de
    # fora de propósito: é sombra, não roupa.
    'M19274.021,7160.922': '#d08b6c',
    'M224.918,407.565':    '#d08b6c',
}


def recolorir_heroi(caminho):
    import re as _re
    with open(caminho, encoding='utf-8') as f:
        svg = f.read()
    mudou = 0
    for inicio, cor in HEROI.items():
        # o fill pode vir antes ou depois do `d` no mesmo <path>
        padrao = _re.compile(
            r'(<path\b[^>]*?)fill="#[0-9a-fA-F]{3,6}"([^>]*?d="' + _re.escape(inicio) + r')'
            r'|(<path\b[^>]*?d="' + _re.escape(inicio) + r'[^"]*"[^>]*?)fill="#[0-9a-fA-F]{3,6}"'
        )
        def troca(m):
            if m.group(1) is not None:
                return f'{m.group(1)}fill="{cor}"{m.group(2)}'
            return f'{m.group(3)}fill="{cor}"'
        svg, n = padrao.subn(troca, svg, count=1)
        mudou += n
    with open(caminho, 'w', encoding='utf-8') as f:
        f.write(svg)
    return mudou, len(HEROI)


def recolorir(caminho, destino):
    with open(caminho, encoding='utf-8') as f:
        svg = f.read()

    def troca(m):
        cor = m.group(0).lower()
        return destino if cor in ACENTOS else m.group(0)

    novo = re.sub(r'#[0-9a-fA-F]{6}\b', troca, svg)
    mudou = novo != svg
    if mudou:
        with open(caminho, 'w', encoding='utf-8') as f:
            f.write(novo)
    return mudou


def acentos_em(caminho):
    with open(caminho, encoding='utf-8') as f:
        cores = {c.lower() for c in re.findall(r'#[0-9a-fA-F]{6}\b', f.read())}
    return cores & ACENTOS


if __name__ == '__main__':
    falhas = []
    for arquivo, cor in sorted(DESTINO.items()):
        caminho = os.path.join(DIR, arquivo)
        if not os.path.exists(caminho):
            print(f'  {arquivo:<20} AUSENTE'); falhas.append(arquivo); continue

        # O herói não passa pela troca por cor: ver o bloco HEROI acima.
        if arquivo == 'heroi.svg':
            feitos, total = recolorir_heroi(caminho)
            estado = 'ok' if feitos == total else f'SÓ {feitos}/{total} ELEMENTOS'
            print(f'  {arquivo:<20} {"manual":<8} {estado} (repintura elemento a elemento, ver HEROI)')
            if feitos != total:
                falhas.append(arquivo)
            continue

        recolorir(caminho, cor)
        restantes = acentos_em(caminho)
        nome = 'cobalto' if cor == COBALTO else 'jade'
        ok = restantes <= {cor}
        print(f'  {arquivo:<20} {nome:<8} {"ok" if ok else "AINDA MISTURA: " + str(restantes)}')
        if not ok:
            falhas.append(arquivo)

    # Rede de segurança: nenhum arquivo do diretório pode ficar de fora da tabela,
    # senão uma arte nova entra bicolor sem ninguém perceber.
    for arquivo in sorted(os.listdir(DIR)):
        if arquivo.endswith('.svg') and arquivo not in DESTINO:
            if arquivo in FORA_DA_TABELA:
                print(f'  {arquivo:<20} {FORA_DA_TABELA[arquivo]}')
                continue
            print(f'  {arquivo:<20} FORA DA TABELA — defina a cor em DESTINO')
            falhas.append(arquivo)

    print('\n' + ('TUDO CERTO: uma cor por arte.' if not falhas else f'PENDENTE: {falhas}'))
