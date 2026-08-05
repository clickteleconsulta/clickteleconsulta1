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
    'acesso-cliente.svg':      COBALTO,
    'acesso-profissional.svg': JADE,
}


# ─────────────────────────────────────────────────────────────────────────────
# O HERÓI É EXCEÇÃO DECLARADA À REGRA DE UMA COR POR ARTE (04/08/2026).
#
# Ele tem folhas em jade e um calendário em cobalto na mesma imagem. Foi decisão
# do cliente, e está registrada aqui em vez de acontecer em silêncio — se ficasse
# só no arquivo, a varredura por cor acima marcaria "ok" numa arte bicolor e a
# regra viraria letra morta.
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
    # folhas do fundo
    'M994.932,546.427':  '#0c9769',
    'M1027.109,398.517': '#0c9769',
    'M884.712,380.124':  '#0c9769',
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
            print(f'  {arquivo:<20} {"exceção":<8} {estado} (bicolor por decisão, ver HEROI)')
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
            print(f'  {arquivo:<20} FORA DA TABELA — defina a cor em DESTINO')
            falhas.append(arquivo)

    print('\n' + ('TUDO CERTO: uma cor por arte.' if not falhas else f'PENDENTE: {falhas}'))
