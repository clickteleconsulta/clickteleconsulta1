# Tipografia da aviDoc

**Duas fontes, com fronteira rígida: Geist no produto inteiro, Gabarito só no logo.**

| onde | fonte | arquivo | peso |
|---|---|---|---|
| título, texto, número, interface | Geist | `public/fonts/geist-variable.woff2` | 29 KB |
| **apenas** o wordmark | Gabarito | `public/fonts/gabarito-logo.woff2` | 1,1 KB |

Declaração das duas: `src/index.css` · Tailwind (só a Geist):
`tailwind.config.js` → `fontFamily.sans`

## Por que a segunda fonte existe (04/08/2026)

Por um tempo a Geist cobria também o logo, e isso estava errado por um motivo que
só aparece olhando a página inteira: **o wordmark era a mesma letra do texto ao
lado, em corpo maior**. Não havia nada distinguindo a marca do produto — o site
ficava com cara de genérico justamente no ponto onde precisava de assinatura.

A Gabarito é geométrica brasileira, da Naipe Foundry (Leandro Assis e Álvaro
Franca), nascida em material didático. O "a" de dois andares com barriga curta e
os terminais levemente cortados dão o tom amistoso sem cair no infantil.

Foi escolhida entre 12 candidatas livres, comparadas lado a lado escrevendo o
próprio wordmark, em corpo grande e nos 34 px reais do cabeçalho — que é onde a
maioria das fontes bonitas desmonta. As descartadas por serem limpas demais e
sem assinatura: Outfit e Hanken Grotesk. A descartada por ser autoral demais,
com risco de envelhecer rápido: Syne. Finalistas: Bricolage Grotesque (a mais
expressiva) e Fraunces (serifada, a maior distância possível do site).

### As duas regras que não podem ser quebradas

1. **A Gabarito não sai do logo.** Em título, botão ou texto ela deixa de ser
   assinatura e vira mais uma fonte. `fontFamily.sans` do Tailwind aponta só
   para a Geist de propósito — não adicione a Gabarito lá.

2. **O arquivo servido tem SEIS glifos**: `a`, `v`, `i`, `D`, `o`, `c`. O latim
   completo pesava 20 KB, peso morto em toda página por causa de uma palavra.
   Qualquer outra letra sai **em branco**. Para escrever outra coisa na fonte da
   marca, regere o arquivo:

   ```bash
   pip3 install --user fonttools brotli
   # baixe Gabarito[wght].ttf de github.com/google/fonts/tree/main/ofl/gabarito
   python3 -m fontTools.subset Gabarito.ttf --text='aviDoc' --flavor=woff2 \
     --layout-features='*' --no-hinting --output-file=public/fonts/gabarito-logo.woff2
   ```

### Licença

SIL Open Font License 1.1 — `public/fonts/LICENSE-gabarito.txt`. A
[FAQ oficial da OFL](https://openfontlicense.org/ofl-faq/) trata logotipo na
questão **1.1** ("You are very welcome to do so") e na **1.1.1**, que deixa o
desenho vetorizado como obra nossa, não derivada da fonte. A FAQ **não** trata
de registro de marca no INPI — isso é questão para o advogado, não está
respondido aqui.

## Por que uma família só no produto

Antes o site carregava **três**: Plus Jakarta Sans (títulos) e DM Sans (corpo) pelo
`index.html`, e Nunito Sans pelo `App.jsx` — esta última nem era usada de propósito,
só chegava a 8 telas pelo `font-sans` do Tailwind, que apontava para ela enquanto o
`body` apontava para DM Sans. Somavam **263 KB e três requisições ao Google**.

Hoje é **um arquivo de 29 KB, servido do próprio domínio**. A Geist é variável: o
mesmo arquivo cobre os pesos 100 a 900, então usar 400 no texto e 800 num título não
custa download nenhum a mais. Com família única, a hierarquia vem do peso e do
tamanho, não do contraste entre dois desenhos.

O modelo veio da **Sesame Care**, medida com `getComputedStyle` em 04/08/2026: uma
família (Saans, comercial), dois pesos em uso (460 no texto, 670 nos títulos),
tracking negativo só acima de 18 px, entrelinha 1,0 nos títulos e 1,5 no corpo.

## Por que a Geist e não outra

Fontes dos concorrentes, medidas nos sites de produção em 04/08/2026:

| concorrente | fonte |
|---|---|
| Doctoralia | Work Sans nos títulos; corpo na pilha do sistema |
| Medprev | Nunito, família única |
| BoaConsulta | Roboto, família única |

A Geist é neo-grotesca de terminais retos e **não encosta em nenhuma das três**.
Descartadas por proximidade: **Inter** (mesmo território da Roboto/BoaConsulta),
**Manrope** e **Onest** (mesma sensação macia da Nunito/Medprev).

Vale registrar: a Nunito Sans que o site carregava é a **irmã direta da Nunito da
Medprev**. Estávamos vestindo parte da roupa do concorrente sem ter decidido isso.

## Licença

SIL Open Font License 1.1 — Vercel, em colaboração com a basement.studio.
Uso comercial livre, redistribuição junto com o site permitida. O texto da licença
acompanha o arquivo em `public/fonts/LICENSE-geist.txt` e é publicado junto com o
site, que é o que a OFL exige de quem redistribui a fonte.

## O que isto corrigiu no logo

O `Wordmark.jsx` pedia `'Avenir Next', Avenir, Futura, …` — fontes proprietárias que
só existem no macOS e no iOS. Em Windows e Android o navegador caía para Segoe UI ou
Roboto, então **a marca aparecia com um desenho diferente conforme o aparelho**. Como
agora servimos a fonte, o logo sai idêntico em qualquer lugar.

## Ao mexer

- Trocar de fonte = trocar `public/fonts/`, o `@font-face` em `src/index.css` e o
  `fontFamily.sans` no `tailwind.config.js`. Os três precisam concordar.
- O `<link rel="preload">` no `index.html` aponta para o nome do arquivo. Se o
  arquivo mudar de nome, atualize lá também, senão o texto pisca na fonte do sistema
  antes de a certa chegar.
- **Não** volte a carregar fonte de CDN externa: a CSP foi fechada junto com esta
  mudança (`style-src` e `font-src` não listam mais o Google).
- **Os PDFs legais usam a Geist e a embutem no arquivo.** O gerador declara um
  `@font-face` apontando para uma cópia local do `.woff2` e o Chrome embute o
  subconjunto usado — dá para conferir pelos nomes `AAAAAA+Geist-Bold` dentro do
  PDF, que só aparecem quando a fonte está embutida. Ao trocar de fonte, atualize
  a cópia usada pelo gerador junto com a do site.
- **Os e-mails transacionais seguem em pilha de sistema, de propósito**: cliente
  de e-mail não baixa webfont, então declarar a Geist ali só criaria uma
  divergência silenciosa entre o que se vê no site e no e-mail.
