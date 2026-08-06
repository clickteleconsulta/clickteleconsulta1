#!/usr/bin/env python3
"""
Peças de anúncio para captar os PRIMEIROS agendamentos.

O PROBLEMA QUE ESTAS PEÇAS RESOLVEM
Marketplace novo não tem avaliação, não tem "mais de X pacientes atendidos", não
tem depoimento. E é justamente aí que a tentação aparece: inventar prova social.
Além de ser mentira, no Brasil isso é publicidade médica enganosa — e a
Resolução CFM 2.336/2023 já proíbe cupom, sorteio e indicação premiada, que são
as outras muletas do lançamento.

Então estas peças não fingem popularidade. Elas apoiam-se no que é VERIFICÁVEL
hoje, no primeiro dia:

  PREÇO         o valor aparece antes de agendar. A CFM permite divulgar preço;
                o que ela veda é a mecânica promocional. Preço baixo e visível
                é o argumento mais forte de quem não tem reputação ainda.
  AGILIDADE     agendar leva minutos, e isso é demonstrável na hora.
  DISPONIBILIDADE  7 dias por semana.
  SEM AMARRA    sem convênio, sem mensalidade — paga quem usa.
  ESCOLHA       o paciente escolhe o médico, o dia e a hora. É o que separa um
                MARKETPLACE de uma plataforma de teleconsulta, que encaixa quem
                estiver livre — e reforça, no anúncio, o posicionamento que o
                site inteiro sustenta.

NÃO USE VERIFICAÇÃO DE REGISTRO COMO ARGUMENTO sem antes acertar o que é dito no
site. Houve uma peça assim, dizendo "registro checado junto ao CRM do estado", e
ela saiu: a conferência é feita PELA PLATAFORMA, que checa se o médico é quem diz
ser e se o registro é válido. Afirmar checagem "junto ao CRM" sugere integração
com o órgão, que não existe. Em publicidade de saúde essa distância vira
problema.

TODO O TEXTO SAI DE FRASES JÁ APROVADAS NO SITE. Nada aqui foi escrito do zero
para o anúncio — copy de saúde inventada é como se cria problema jurídico.
Se precisar de mensagem nova, ela nasce no site primeiro.

Uso:
    python3 tools/gerar-anuncios.py
"""
import os
import sys

from PIL import Image, ImageDraw

# Reaproveita fonte, cores e a cruz do gerador da marca — dois arquivos
# desenhando a mesma marca é como as versões divergem.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from importlib import import_module
_m = import_module('gerar-marca')
fonte, desenhar_cruz, desenhar_wordmark, encaixar = _m.fonte, _m.desenhar_cruz, _m.desenhar_wordmark, _m.encaixar
COBALTO, JADE, TINTA = _m.COBALTO, _m.JADE, _m.TINTA

import glob
import shutil
import subprocess
import tempfile

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAIDA = os.path.join(RAIZ, 'public', 'marca', 'anuncios')

ILUSTRA = os.path.join(RAIZ, 'public', 'ilustra')
FONTES = os.path.join(RAIZ, 'public', 'marca', 'anuncios', 'fontes')
CACHE_PNG = os.path.join(RAIZ, '.cache-ilustra')


def rasterizar(caminho_svg, larg):
    """SVG -> PNG usando o Quick Look do macOS.

    Nada precisa ser instalado: o `qlmanage` já vem no sistema e desenha SVG
    corretamente. As alternativas todas custavam mais — cairosvg exige libcairo,
    que não existe aqui, e rasterizar pelo navegador obriga a trafegar a imagem
    inteira em base64 de volta.

    Ele devolve a arte dentro de um quadrado, com folga transparente em volta;
    o recorte abaixo é o que devolve a proporção real do desenho.
    """
    os.makedirs(CACHE_PNG, exist_ok=True)
    nome = os.path.splitext(os.path.basename(caminho_svg))[0]
    destino = os.path.join(CACHE_PNG, f'{nome}-{larg}.png')
    if os.path.exists(destino):
        return Image.open(destino)

    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(['qlmanage', '-t', '-s', str(larg * 2), '-o', tmp, caminho_svg],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
        achados = glob.glob(os.path.join(tmp, '*.png'))
        if not achados:
            raise RuntimeError(f'qlmanage não rasterizou {caminho_svg}')
        im = Image.open(achados[0]).convert('RGBA')

    # O recorte é contra BRANCO, não contra transparência: o qlmanage devolve a
    # imagem com alfa 255 em tudo, chapada sobre branco. Usar getbbox() aqui não
    # recorta nada — a folga do quadrado fica, e o desenho sai pequeno no meio
    # de uma margem que não deveria existir.
    from PIL import ImageChops
    fundo = Image.new('RGB', im.size, (255, 255, 255))
    caixa = ImageChops.difference(im.convert('RGB'), fundo).getbbox()
    if caixa:
        im = im.crop(caixa)
    im = im.resize((larg, max(1, round(im.height * larg / im.width))), Image.LANCZOS)
    im.save(destino)
    return im


# Qual arte acompanha cada mensagem.
#
# TODAS SÃO DO STORYSET, ESTILO "CUATE". A leva anterior era do unDraw e foi
# descartada inteira: o traço do unDraw é econômico demais — figura sem rosto,
# poucos elementos, muito branco — e no feed, ampliado a 1080px, lê como desenho
# incompleto. O cuate tem cena, profundidade e detalhe, que é o que segura o olho
# de quem está rolando o dedo.
#
# O acento amarelo do Storyset (#ffc727) foi trocado pelo cobalto da marca
# (#3B5BA5) direto no SVG. Carvão, cinzas e tons de pele ficam como estão: são o
# que dá volume ao traço, e mexer neles achata o desenho.
#
# ATENÇÃO — ATRIBUIÇÃO OBRIGATÓRIA. A licença gratuita do Storyset exige crédito
# em todo uso. Está registrado em fontes/LEIA-ME.txt, com onde o crédito precisa
# aparecer. Sem ele, o uso comercial não está coberto.
ARTES = {
    'preco':           os.path.join(FONTES, 'online-doctor.svg'),
    'agilidade':       os.path.join(FONTES, 'date-picker.svg'),
    'disponibilidade': os.path.join(FONTES, 'events.svg'),
    'sem-mensalidade': os.path.join(FONTES, 'wallet.svg'),
    'escolha':         os.path.join(FONTES, 'doctors.svg'),
}

BRANCO = (255, 255, 255)
COBALTO_FUNDO = (47, 74, 138)     # um passo mais escuro que o cobalto da marca:
                                  # texto branco sobre o #3B5BA5 puro fica no
                                  # limite do contraste em tela de celular.

# ─────────────────────────────────────────────────────────────────────────────
# As mensagens. `chapeu` é o rótulo pequeno, `titulo` é o que a pessoa lê de
# longe, `apoio` é a linha que sustenta a afirmação.
#
# Uma peça = uma ideia. Anúncio que tenta dizer preço, rapidez e confiança ao
# mesmo tempo não diz nada — e no feed a pessoa decide em menos de um segundo.
MENSAGENS = [
    dict(
        arquivo='preco',
        chapeu='TELECONSULTA',
        titulo='A partir de\nR$ 40',
        apoio='Você vê o preço antes de agendar.',
        escuro=False,
        destaque='R$ 40',
    ),
    dict(
        arquivo='agilidade',
        chapeu='SEM FILA',
        titulo='Agende em\nminutos',
        apoio='Escolha o médico, o horário e pronto.',
        escuro=True,
    ),
    dict(
        arquivo='disponibilidade',
        chapeu='TODOS OS DIAS',
        titulo='7 dias\npor semana',
        apoio='Inclusive no fim de semana.',
        escuro=False,
    ),
    dict(
        arquivo='sem-mensalidade',
        chapeu='PARTICULAR',
        titulo='Sem convênio,\nsem mensalidade',
        apoio='Você paga só a consulta que usar.',
        escuro=True,
    ),
    dict(
        arquivo='escolha',
        chapeu='VOCÊ NO CONTROLE',
        titulo='Você escolhe\no médico',
        apoio='E o dia e a hora. Ninguém escolhe por você.',
        escuro=False,
    ),
]

# Largura × altura × onde a marca fica. As três medidas cobrem o que as redes
# realmente usam: vertical para TikTok/Reels/Stories, quadrado para feed, e o
# 1200×628 que Meta e Google pedem em anúncio de link.
FORMATOS = [
    # O vertical pede corpo MAIOR, não igual ao quadrado: 1920px de altura
    # engolem o texto e a peça chega ao feed parecendo inacabada. E o bloco
    # sobe para o terço superior, que é onde o olho pousa em vídeo vertical —
    # centrado de verdade ele briga com a interface do app no meio da tela.
    # `arte` diz onde a ilustração entra: 'abaixo' empilha texto em cima e
    # desenho embaixo (verticais e quadrado); 'lado' põe o desenho à direita,
    # que é o único arranjo que funciona numa peça larga e baixa.
    dict(nome='story', larg=1080, alt=1920, corpo=124, chapeu_px=38, apoio_px=46,
         ancora=0.13, arte='abaixo', arte_larg=0.86),
    dict(nome='feed', larg=1080, alt=1080, corpo=88, chapeu_px=30, apoio_px=36,
         ancora=0.09, arte='abaixo', arte_larg=0.66),
    dict(nome='link', larg=1200, alt=628, corpo=64, chapeu_px=24, apoio_px=28,
         ancora=0.20, arte='lado', arte_larg=0.40),
]


def _quebrar(draw, texto, f, largura_max):
    """Quebra respeitando as quebras manuais do texto."""
    linhas = []
    for bloco in texto.split('\n'):
        atual = ''
        for palavra in bloco.split(' '):
            teste = f'{atual} {palavra}'.strip()
            if draw.textlength(teste, font=f) <= largura_max or not atual:
                atual = teste
            else:
                linhas.append(atual)
                atual = palavra
        if atual:
            linhas.append(atual)
    return linhas


def desenhar(msg, fmt):
    larg, alt = fmt['larg'], fmt['alt']
    escuro = msg['escuro']
    fundo = COBALTO_FUNDO if escuro else BRANCO
    tinta = BRANCO if escuro else TINTA
    apoio_cor = (214, 224, 242) if escuro else (90, 100, 116)
    chapeu_cor = (140, 200, 175) if escuro else JADE

    img = Image.new('RGB', (larg, alt), fundo)
    d = ImageDraw.Draw(img)

    margem = int(larg * 0.09)
    # Com a arte ao lado, o texto não pode usar a largura toda — senão passa por
    # cima do desenho.
    util = int((larg - 2 * margem) * (0.52 if fmt.get('arte') == 'lado' else 1.0))

    f_chapeu = fonte('Geist.ttf', fmt['chapeu_px'], 700)
    f_titulo = fonte('Geist.ttf', fmt['corpo'], 800)
    f_apoio = fonte('Geist.ttf', fmt['apoio_px'], 400)

    linhas = _quebrar(d, msg['titulo'], f_titulo, util)
    entrelinha = int(fmt['corpo'] * 1.08)

    # Altura do bloco inteiro, para centrar verticalmente de uma vez. Centrar
    # cada parte em separado faz o conjunto parecer torto quando o título tem
    # duas linhas numa peça e três em outra.
    h_bloco = fmt['chapeu_px'] + int(fmt['corpo'] * 0.55) + len(linhas) * entrelinha \
        + int(fmt['corpo'] * 0.45) + fmt['apoio_px']
    ancora = fmt.get('ancora')
    y = int(alt * ancora) if ancora else (alt - h_bloco) // 2 - int(alt * 0.04)

    # Chapéu, com um traço jade antes — o traço é o que dá ritmo à peça sem
    # precisar de mais um elemento gráfico.
    d.rectangle([margem, y + fmt['chapeu_px'] * 0.35,
                 margem + int(fmt['chapeu_px'] * 1.6), y + fmt['chapeu_px'] * 0.5],
                fill=chapeu_cor)
    d.text((margem + int(fmt['chapeu_px'] * 2.1), y), msg['chapeu'],
           font=f_chapeu, fill=chapeu_cor)
    y += fmt['chapeu_px'] + int(fmt['corpo'] * 0.55)

    for linha in linhas:
        # O valor ganha o cobalto nas peças claras: é o número que a pessoa
        # precisa levar embora, e ele some se ficar do mesmo tom do resto.
        cor = COBALTO if (not escuro and msg.get('destaque') and msg['destaque'] in linha) else tinta
        d.text((margem, y), linha, font=f_titulo, fill=cor)
        y += entrelinha

    y += int(fmt['corpo'] * 0.30)
    for linha in _quebrar(d, msg['apoio'], f_apoio, util):
        d.text((margem, y), linha, font=f_apoio, fill=apoio_cor)
        y += int(fmt['apoio_px'] * 1.35)

    # ── Assinatura primeiro, porque ela define o teto da ilustração ─────────
    # Na primeira versão a arte era colocada antes e escalada só pela LARGURA.
    # Resultado: nas peças de desenho alto ela descia por cima do logo — e um
    # anúncio com a marca encoberta é um anúncio sem marca.
    alvo_l = int(larg * (0.30 if fmt['nome'] != 'link' else 0.22))
    wm = desenhar_wordmark(300, escuro=escuro)
    wm = wm.resize((alvo_l, max(1, round(wm.height * alvo_l / wm.width))), Image.LANCZOS)
    y_wm = alt - margem - wm.height - (int(alt * 0.06) if fmt['nome'] == 'story' else 0)

    # ── Ilustração ──────────────────────────────────────────────────────────
    # Depois do texto, porque as artes do unDraw têm manchas de fundo claras que
    # passariam por cima das letras. Colada com máscara alfa, senão o retângulo
    # do PNG apaga o fundo colorido das peças escuras.
    caminho = ARTES.get(msg['arquivo'])
    if caminho and os.path.exists(caminho) and fmt.get('arte'):
        respiro = int(alt * 0.04)
        if fmt['arte'] == 'lado':
            teto, chao = margem, alt - margem
        else:
            teto, chao = y + respiro, y_wm - respiro
        banda = max(1, chao - teto)

        arte = rasterizar(caminho, int(larg * fmt['arte_larg']))
        # A arte obedece ao MENOR entre a largura reservada e a banda livre.
        # Sem o segundo limite, desenho alto invade o que estiver embaixo.
        if arte.height > banda:
            nova_l = max(1, round(arte.width * banda / arte.height))
            arte = arte.resize((nova_l, banda), Image.LANCZOS)

        if fmt['arte'] == 'lado':
            x = larg - margem - arte.width
        else:
            x = (larg - arte.width) // 2

        # Nas peças de fundo cobalto a arte ganha um CARTÃO BRANCO por baixo.
        # Não é enfeite: as ilustrações vêm chapadas sobre branco e contêm
        # branco de verdade (o jaleco dos médicos), então não dá para vazar o
        # branco por transparência sem furar o desenho. O cartão assume isso e
        # transforma o retângulo inevitável em decisão de layout.
        if escuro:
            folga = int(larg * 0.035)
            d.rounded_rectangle(
                [x - folga, chao - arte.height - folga, x + arte.width + folga, chao + folga],
                radius=int(larg * 0.028), fill=BRANCO)
        # Assentada no chão da banda: desenho boiando no meio da sobra parece
        # diagramação automática.
        img.paste(arte, (x, chao - arte.height), arte)

    img.paste(wm, (margem, y_wm), wm)

    return img


def gerar():
    os.makedirs(SAIDA, exist_ok=True)
    feitos = []
    for msg in MENSAGENS:
        for fmt in FORMATOS:
            img = desenhar(msg, fmt)
            alvo = os.path.join(SAIDA, f"{msg['arquivo']}-{fmt['nome']}.png")
            img.save(alvo)
            feitos.append(alvo)
    return feitos


if __name__ == '__main__':
    print('Gerando peças de anúncio…')
    for caminho in gerar():
        print(f"  {os.path.relpath(caminho, RAIZ):<52} {os.path.getsize(caminho):>7} bytes")
    print(f'\n{len(MENSAGENS)} mensagens × {len(FORMATOS)} formatos.')
