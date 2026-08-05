#!/usr/bin/env python3
"""
Vídeos verticais das mesmas mensagens dos anúncios.

POR QUE VÍDEO, SE JÁ EXISTEM AS ESTÁTICAS
No TikTok e no Reels o leilão favorece vídeo: imagem parada compete pelo mesmo
espaço pagando mais caro pela mesma entrega. As estáticas seguem úteis (feed do
Meta, anúncio de link), mas para captar os primeiros agendamentos vindos de
TikTok, movimento é o que faz o custo cair.

O QUE ESTES VÍDEOS SÃO, E O QUE NÃO SÃO
São tipografia animada: as frases entram, seguram e o endereço fecha. Não têm
pessoa, não têm locução, não têm trilha — e é bom que isso esteja escrito, para
ninguém esperar outra coisa. Servem para começar e para testar QUAL MENSAGEM
converte, gastando pouco.

O que costuma bater tipografia animada no TikTok é vídeo com gente falando, de
celular mesmo. Quando existirem pacientes atendidos e médicos parceiros
dispostos, é para lá que a verba deve migrar. Estes aqui são o que dá para fazer
hoje, sem inventar prova social e sem gravar nada.

SEM ÁUDIO, DE PROPÓSITO
Trilha genérica não ajuda e áudio protegido cria problema de direitos. No app,
na hora de publicar, dá para escolher um som em alta — que é o que o algoritmo
premia mesmo.

Uso:
    python3 tools/gerar-videos.py
"""
import os
import subprocess
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from importlib import import_module

_a = import_module('gerar-anuncios')
_m = import_module('gerar-marca')
MENSAGENS, _quebrar = _a.MENSAGENS, _a._quebrar
BRANCO, COBALTO_FUNDO = _a.BRANCO, _a.COBALTO_FUNDO
fonte, desenhar_wordmark = _m.fonte, _m.desenhar_wordmark
COBALTO, JADE, TINTA = _m.COBALTO, _m.JADE, _m.TINTA

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAIDA = os.path.join(RAIZ, 'public', 'marca', 'videos')

LARG, ALT = 1080, 1920
FPS = 24
SEGUNDOS = 6
TOTAL = FPS * SEGUNDOS

CORPO, CHAPEU_PX, APOIO_PX = 136, 40, 50
MARGEM = int(LARG * 0.09)


def suave(t):
    """Desaceleração cúbica. Entrada linear parece máquina; esta parece intenção."""
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 3


def entrada(quadro, comeca, dura=14):
    """Progresso 0→1 de um elemento que começa em `comeca`."""
    return suave((quadro - comeca) / dura)


def render(msg, quadro):
    escuro = msg['escuro']
    fundo = COBALTO_FUNDO if escuro else BRANCO
    tinta = BRANCO if escuro else TINTA
    apoio_cor = (214, 224, 242) if escuro else (90, 100, 116)
    chapeu_cor = (140, 200, 175) if escuro else JADE

    img = Image.new('RGB', (LARG, ALT), fundo)
    d = ImageDraw.Draw(img)
    util = LARG - 2 * MARGEM

    f_chapeu = fonte('Geist.ttf', CHAPEU_PX, 700)
    f_titulo = fonte('Geist.ttf', CORPO, 800)
    f_apoio = fonte('Geist.ttf', APOIO_PX, 400)
    linhas = _quebrar(d, msg['titulo'], f_titulo, util)
    entrelinha = int(CORPO * 1.08)

    def mistura(cor, p):
        """Fade feito por interpolação com o fundo — o PIL não desenha texto com
        alfa direto no RGB, e criar uma camada por elemento a cada quadro custa
        caro em 720 quadros."""
        return tuple(round(fundo[i] + (cor[i] - fundo[i]) * p) for i in range(3))

    y0 = int(ALT * 0.30)

    # Traço jade: cresce em largura em vez de aparecer pronto. É o primeiro
    # movimento do vídeo e o que ancora o olho no canto do texto.
    p = entrada(quadro, 0, 12)
    if p > 0:
        larg_traco = int(CHAPEU_PX * 1.6 * p)
        if larg_traco > 1:
            d.rectangle([MARGEM, y0 + CHAPEU_PX * 0.35,
                         MARGEM + larg_traco, y0 + CHAPEU_PX * 0.5], fill=chapeu_cor)

    p = entrada(quadro, 6)
    if p > 0:
        d.text((MARGEM + int(CHAPEU_PX * 2.1), y0 - int(10 * (1 - p))),
               msg['chapeu'], font=f_chapeu, fill=mistura(chapeu_cor, p))

    y = y0 + CHAPEU_PX + int(CORPO * 0.55)
    for i, linha in enumerate(linhas):
        # Cada linha entra 5 quadros depois da anterior. É a escada que faz a
        # frase ser LIDA, e não vista de uma vez.
        p = entrada(quadro, 12 + i * 5, 16)
        if p > 0:
            base = COBALTO if (not escuro and msg.get('destaque') and msg['destaque'] in linha) else tinta
            d.text((MARGEM, y + int(38 * (1 - p))), linha, font=f_titulo, fill=mistura(base, p))
        y += entrelinha

    y += int(CORPO * 0.30)
    for i, linha in enumerate(_quebrar(d, msg['apoio'], f_apoio, util)):
        p = entrada(quadro, 12 + len(linhas) * 5 + 6 + i * 4, 16)
        if p > 0:
            d.text((MARGEM, y + int(24 * (1 - p))), linha, font=f_apoio, fill=mistura(apoio_cor, p))
        y += int(APOIO_PX * 1.35)

    # Fecho: marca e endereço. Entram por último porque são o que a pessoa deve
    # levar embora — e o endereço só faz sentido depois de ela querer ir.
    p_fim = entrada(quadro, TOTAL - 62, 18)
    if p_fim > 0:
        alvo_l = int(LARG * 0.30)
        wm = desenhar_wordmark(300, escuro=escuro)
        wm = wm.resize((alvo_l, max(1, round(wm.height * alvo_l / wm.width))), Image.LANCZOS)
        camada = Image.new('RGBA', wm.size, (0, 0, 0, 0))
        camada = Image.blend(camada, wm, p_fim)
        y_wm = ALT - MARGEM - wm.height - int(ALT * 0.06)
        img.paste(camada, (MARGEM, y_wm + int(20 * (1 - p_fim))), camada)

        f_end = fonte('Geist.ttf', 40, 600)
        d.text((MARGEM, y_wm + wm.height + 22), 'avidoc.com.br',
               font=f_end, fill=mistura(COBALTO if not escuro else (200, 214, 240), p_fim))

    return img


def gerar_um(msg):
    exe = __import__('imageio_ffmpeg').get_ffmpeg_exe()
    alvo = os.path.join(SAIDA, f"{msg['arquivo']}.mp4")
    proc = subprocess.Popen(
        [exe, '-y', '-loglevel', 'error',
         '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{LARG}x{ALT}', '-r', str(FPS), '-i', '-',
         # yuv420p e +faststart não são preciosismo: sem os dois, rede social
         # rejeita ou reprocessa o arquivo, e reprocessamento borra o texto.
         '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
         '-pix_fmt', 'yuv420p', '-movflags', '+faststart', alvo],
        stdin=subprocess.PIPE)
    for q in range(TOTAL):
        proc.stdin.write(render(msg, q).tobytes())
    proc.stdin.close()
    proc.wait()
    return alvo


def gerar():
    os.makedirs(SAIDA, exist_ok=True)
    return [gerar_um(m) for m in MENSAGENS]


if __name__ == '__main__':
    print(f'Gerando vídeos {LARG}x{ALT}, {SEGUNDOS}s a {FPS}fps…')
    for caminho in gerar():
        print(f'  {os.path.relpath(caminho, RAIZ):<44} {os.path.getsize(caminho) // 1024:>5} KB')
