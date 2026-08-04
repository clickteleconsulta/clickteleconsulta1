# Ilustrações do site

As ilustrações vêm do **[unDraw](https://undraw.co)**, recoloridas para a marca.
Ficam em `public/ilustra/`, uma por lugar onde aparecem.

| arquivo | onde aparece |
|---|---|
| `heroi.svg` | topo da home |
| `faq.svg` | Perguntas frequentes |
| `quem-somos.svg` | Quem somos |
| `suporte.svg` | Suporte |
| `blog.svg` | Blog |
| `nao-achou.svg` | página 404 |
| `sem-dados.svg` | listagem sem resultado |

## Licença

Grátis, **uso comercial permitido, sem atribuição**, e a modificação é
autorizada — foi o que permitiu recolorir para o nosso cobalto exato, coisa que
banco de imagem fechado não deixaria fazer. [Termos](https://undraw.co/license),
conferidos em 04/08/2026.

As duas restrições: não usar os arquivos para treinar modelos de IA e não
redistribuí-los em pacote. Nenhuma nos afeta.

## Como recolorir uma nova

O unDraw pinta tudo com **uma única cor de acento**, `#6c63ff`. Trocar tudo por
cobalto deixaria a arte monocromática — que era justamente o problema. Então a
maioria vira cobalto e **a cada três ocorrências, uma vira jade**:

```python
import re
COB, JADE = '#3B5BA5', '#0C9769'
n = [0]
def troca(m):
    n[0] += 1
    return JADE if n[0] % 3 == 0 else COB
svg = re.sub(r'#6c63ff', troca, svg, flags=re.I)
```

Duas cores sem escolher forma por forma. Sempre **olhe o resultado** depois: em
arte com poucos acentos, uma proporção diferente pode cair melhor.

O jade em ilustração é exceção deliberada à regra de "jade só no logo" — está
registrada em `public/marca/LEIA-ME.txt`. Ele continua fora de botão, link e
ícone de interface: em ilustração é enfeite; em interface, seria estado.

**Nunca use `#16A34A`** (verde de sucesso) numa ilustração — o jade já fica a
18° dele, e usar os dois confundiria "enfeite" com "confirmado".

## Como baixar do unDraw

A busca do site tem endpoint público. O parâmetro é `q` e exige `User-Agent`:

```
https://undraw.co/api/search?q=doctor
```

A resposta traz `media` com a URL do SVG. Não monte a URL do CDN pelo slug: o
caminho às vezes é `/illustration/` e às vezes `/illustrations/`, e chutar dá 404.

## Como trocar a arte do herói

Uma constante no topo de `src/pages/HomePage.jsx`:

```js
const HERO_ARTE = '/ilustra/heroi.svg';
```

A caixa usa `object-contain` com altura máxima, então qualquer proporção entra
inteira, **sem recorte**. Arte e botão ficam empilhados em fluxo normal — houve
uma versão com o botão em posição absoluta sobre a ilustração, para mirar uma
mão que apontava; sem essa mão, o botão só colidia com a figura.

## Se um dia contratarmos ilustração própria

O que a cena precisa mostrar: alguém **agendando uma teleconsulta** e vendo o
preço antes. O que NÃO pode aparecer:

| proibido | por quê |
|---|---|
| carteirinha de convênio / plano de saúde | a aviDoc é **sem convênio** |
| cruz verde | colide com a cruz da marca |
| `#16A34A` | é o verde de estado de sucesso |
| amarelo ou creme dominante | assinatura visual do Zocdoc |
| receita, medicamento ou diagnóstico legível | conteúdo clínico exige cuidado regulatório |

Paleta: cobalto `#3B5BA5` como principal, jade `#0C9769` como detalhe, apoio em
`#7E9AD4`, `#DCE5F5` e fundo `#F2F5FB`. Peles variadas — o público é brasileiro.
Exigir **cessão de direitos patrimoniais** por escrito, senão a arte não é da
empresa.
