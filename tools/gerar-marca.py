#!/usr/bin/env python3
"""
Gera os arquivos de marca a partir de UMA definição só.

Por que existe: os PNGs de public/marca/ eram feitos à mão. Quando o wordmark
mudou de fonte (Geist -> Gabarito) e a cruz saiu do meio para o fim, os arquivos
ficaram mostrando uma marca que o site não usa mais — e ninguém percebe, porque
eles só aparecem em e-mail, prévia de link e perfil de rede social. Com o
gerador, refazer todos é um comando.

Uso:
    python3 tools/gerar-marca.py

Precisa das fontes em TTF (o PIL não lê woff2). Elas NÃO ficam no repositório:
o script baixa do Google Fonts e do repositório da Vercel na primeira execução.

A geometria da cruz e as cores são as mesmas de src/components/Logo.jsx e
src/config/brand.js. Se mudarem lá, mudam aqui — são dois lugares, e é por isso
que este cabeçalho existe.
"""
import math
import os
import urllib.request
from PIL import Image, ImageDraw, ImageFont

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(RAIZ, '.cache-fontes')
SAIDA_MARCA = os.path.join(RAIZ, 'public', 'marca')
SAIDA_PUB = os.path.join(RAIZ, 'public')

# ── Cores — espelham src/config/brand.js ────────────────────────────────────
TINTA = (21, 26, 32)
COBALTO = (59, 91, 165)
JADE = (12, 151, 105)
TINTA_ESCURA = (255, 255, 255)      # versão para fundo escuro
COBALTO_CLARO = (159, 180, 222)
JADE_CLARO = (61, 220, 151)

FONTES = {
    'Gabarito.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/gabarito/Gabarito%5Bwght%5D.ttf',
    'Geist.ttf': 'https://raw.githubusercontent.com/vercel/geist-font/main/packages/next/dist/fonts/geist-sans/Geist-Variable.ttf',
}

# Supersampling: desenhamos tudo em 4x e reduzimos no fim. A cruz tem cantos
# arredondados de 2,5 unidades num viewBox de 24 — sem isso eles saem serrilhados.
SS = 4


def fonte(arquivo, tamanho, peso):
    os.makedirs(CACHE, exist_ok=True)
    caminho = os.path.join(CACHE, arquivo)
    if not os.path.exists(caminho):
        print(f'  baixando {arquivo}…')
        urllib.request.urlretrieve(FONTES[arquivo], caminho)
    f = ImageFont.truetype(caminho, tamanho)
    f.set_variation_by_axes([peso])
    return f


def desenhar_cruz(lado, cor):
    """A cruz irradiada, mesma geometria do CROSS_IRRADIADA de Logo.jsx.

    O viewBox original é 24x24. Aqui tudo é escrito nessas unidades e
    multiplicado por `k`, para o desenho continuar comparável ao do componente.
    """
    n = lado * SS
    k = n / 24.0
    img = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Os dois braços.
    d.rounded_rectangle([9.5 * k, 4 * k, 14.5 * k, 20 * k], radius=2.5 * k, fill=cor)
    d.rounded_rectangle([4 * k, 9.5 * k, 20 * k, 14.5 * k], radius=2.5 * k, fill=cor)

    # Os quatro pontos das diagonais. No SVG são retângulos girados em torno de
    # (12,12); aqui a rotação é resolvida na conta, e cada ponto é desenhado numa
    # camada própria que é girada e colada — girar a imagem toda deformaria os braços.
    for angulo in (45, 135):
        for y_orig in (0, 21):
            cx0, cy0 = 12.0, y_orig + 1.5          # centro do retângulo antes de girar
            dx, dy = cx0 - 12.0, cy0 - 12.0
            r = math.radians(angulo)
            cx = 12.0 + dx * math.cos(r) - dy * math.sin(r)
            cy = 12.0 + dx * math.sin(r) + dy * math.cos(r)

            larg, alt = 2.4 * k, 3.0 * k
            pad = int(alt)                          # folga para a diagonal caber ao girar
            cam = Image.new('RGBA', (int(larg) + 2 * pad, int(alt) + 2 * pad), (0, 0, 0, 0))
            ImageDraw.Draw(cam).rounded_rectangle(
                [pad, pad, pad + larg, pad + alt], radius=1.2 * k, fill=cor)
            cam = cam.rotate(-angulo, resample=Image.BICUBIC, expand=True)

            img.alpha_composite(cam, (int(cx * k - cam.width / 2), int(cy * k - cam.height / 2)))

    return img.resize((lado, lado), Image.LANCZOS)


def desenhar_wordmark(corpo, escuro=False):
    """`avi` + `Doc` + cruz, na mesma ordem e proporção do Wordmark.jsx."""
    c_avi = TINTA_ESCURA if escuro else TINTA
    c_doc = COBALTO_CLARO if escuro else COBALTO
    c_cruz = JADE_CLARO if escuro else JADE

    f = fonte('Gabarito.ttf', corpo, 700)
    # letter-spacing -0.025em do componente: o PIL não tem tracking, então o
    # ajuste entra letra a letra.
    tracking = round(-0.025 * corpo)

    def largura(txt):
        return sum(f.getlength(ch) + tracking for ch in txt)

    l_avi, l_doc = largura('avi'), largura('Doc')
    lado_cruz = round(corpo * 0.72)
    folga = round(corpo * 0.16)

    sobe, desce = f.getbbox('avidoc')[1], f.getbbox('avidoc')[3]
    altura = max(desce - sobe, lado_cruz)
    total = int(l_avi + l_doc + folga + lado_cruz)

    img = Image.new('RGBA', (total, int(altura) + 4), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    x = 0.0
    for txt, cor in (('avi', c_avi), ('Doc', c_doc)):
        for ch in txt:
            d.text((x, -sobe), ch, font=f, fill=cor)
            x += f.getlength(ch) + tracking

    cruz = desenhar_cruz(lado_cruz, c_cruz)
    # Centrada pela altura de maiúscula, não pela caixa toda: alinhar pelo `D`
    # é o que faz a cruz parecer sentada na mesma linha do nome.
    alt_maiuscula = f.getbbox('D')[3] - f.getbbox('D')[1]
    topo = int((alt_maiuscula - lado_cruz) / 2)
    img.alpha_composite(cruz, (int(x + folga), max(0, topo)))
    return img.crop(img.getbbox())


def encaixar(img, larg, alt, margem=0.14):
    """Centra o desenho numa tela de tamanho fixo, respeitando uma margem."""
    tela = Image.new('RGBA', (larg, alt), (0, 0, 0, 0))
    util_l, util_a = larg * (1 - 2 * margem), alt * (1 - 2 * margem)
    escala = min(util_l / img.width, util_a / img.height)
    novo = img.resize((max(1, int(img.width * escala)), max(1, int(img.height * escala))), Image.LANCZOS)
    tela.alpha_composite(novo, ((larg - novo.width) // 2, (alt - novo.height) // 2))
    return tela


def gerar():
    os.makedirs(SAIDA_MARCA, exist_ok=True)
    feitos = []

    wm = desenhar_wordmark(300)
    wm_escuro = desenhar_wordmark(300, escuro=True)

    alvo = os.path.join(SAIDA_MARCA, 'logo.png')
    encaixar(wm, 1400, 420).save(alvo); feitos.append(alvo)

    alvo = os.path.join(SAIDA_MARCA, 'logo-branco.png')
    encaixar(wm_escuro, 1400, 420).save(alvo); feitos.append(alvo)

    # Cabeçalho de e-mail: fundo branco chapado, porque cliente de e-mail não
    # garante transparência.
    cab = Image.new('RGB', (600, 140), (255, 255, 255))
    m = encaixar(wm, 600, 140, margem=0.20)
    cab.paste(m, (0, 0), m)
    alvo = os.path.join(SAIDA_MARCA, 'email-header.png')
    cab.save(alvo); feitos.append(alvo)

    # Só a cruz, para uso solto.
    alvo = os.path.join(SAIDA_MARCA, 'simbolo.png')
    encaixar(desenhar_cruz(700, JADE), 1100, 780).save(alvo); feitos.append(alvo)

    feitos.append(gerar_og())
    return feitos


def gerar_og():
    """Prévia de link (1200x630). Mesmo desenho de antes, wordmark novo.

    O nome do arquivo é versionado de propósito: as redes sociais guardam a
    imagem pela URL, então trocar só o conteúdo não propaga. Ao mudar aqui,
    atualize index.html e src/pages/BlogArticlePage.jsx.
    """
    L, A = 1200, 630
    img = Image.new('RGB', (L, A), (255, 255, 255))
    d = ImageDraw.Draw(img)

    # Faixa diagonal em cobalto bem diluído, com um fio jade na borda.
    faixa = Image.new('RGBA', (L, A), (0, 0, 0, 0))
    fd = ImageDraw.Draw(faixa)
    fd.polygon([(690, 0), (1180, 0), (510, 630), (20, 630)], fill=(240, 244, 251, 255))
    # Fio discreto: o jade cheio aqui virava um risco fluorescente atravessando a
    # imagem e roubava a atenção do preço, que é o que a peça precisa entregar.
    fd.line([(690, 0), (20, 630)], fill=(*JADE_CLARO, 90), width=2)
    img.paste(faixa, (0, 0), faixa)

    wm = desenhar_wordmark(300)
    escala = 300 / wm.height
    wm = wm.resize((int(wm.width * escala), 300), Image.LANCZOS)
    escala = 96 / wm.height
    wm = wm.resize((int(wm.width * escala), 96), Image.LANCZOS)
    img.paste(wm, ((L - wm.width) // 2, 96), wm)

    titulo = fonte('Geist.ttf', 74, 800)
    for i, linha in enumerate(['Agende sua consulta', 'médica online']):
        w = d.textlength(linha, font=titulo)
        d.text(((L - w) / 2, 218 + i * 78), linha, font=titulo, fill=TINTA)

    # Selo do preço. O CFM (Res. 2.336/2023) permite divulgar preço; o que ele
    # veda é cupom, sorteio e indicação premiada.
    rot = fonte('Geist.ttf', 30, 500)
    val = fonte('Geist.ttf', 40, 800)
    t1, t2 = 'a partir de', 'R$ 40,00'
    w1, w2 = d.textlength(t1, font=rot), d.textlength(t2, font=val)
    lg, folga = w1 + w2 + 28, 34
    x0 = (L - lg) / 2 - folga
    d.rounded_rectangle([x0, 378, x0 + lg + 2 * folga, 452], radius=37,
                        fill=(232, 248, 241), outline=(180, 230, 210), width=2)
    d.text((x0 + folga, 400), t1, font=rot, fill=(71, 85, 105))
    d.text((x0 + folga + w1 + 28, 393), t2, font=val, fill=JADE)

    dom = fonte('Geist.ttf', 28, 500)
    wd = d.textlength('avidoc.com.br', font=dom)
    d.text(((L - wd) / 2, 486), 'avidoc.com.br', font=dom, fill=(148, 163, 184))

    alvo = os.path.join(SAIDA_PUB, 'og-image-v3.png')
    img.save(alvo)
    return alvo


if __name__ == '__main__':
    print('Gerando arquivos de marca…')
    for f in gerar():
        print(f'  {os.path.relpath(f, RAIZ):<34} {os.path.getsize(f):>7} bytes')
    print('\nog-image mudou de nome: atualize index.html e BlogArticlePage.jsx.')
