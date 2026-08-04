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
