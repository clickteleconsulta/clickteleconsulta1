# Ilustração do herói — especificação para licenciar

A arte que está em `public/hero/` hoje é **provisória**, gerada por IA para
avaliar composição. Não vai para produção. Este documento é o que basta para
comprar ou encomendar a definitiva.

## O que a cena precisa mostrar

Uma pessoa **agendando uma teleconsulta** e vendo o preço antes. É isso que a
aviDoc faz: intermedia agendamento e pagamento. Cenas aceitáveis:

- mão segurando celular com a agenda de um médico e um valor visível
- paciente em casa em videochamada com um médico de jaleco
- mão apontando ou entregando algo que puxe o olho para o botão

## O que NÃO pode aparecer

| proibido | por quê |
|---|---|
| carteirinha de convênio / plano de saúde | a aviDoc é **sem convênio**; é a proposta do concorrente, não a nossa |
| cruz verde | colide com a cruz da marca, que só existe no logo |
| jade `#0C9769` e verde `#16A34A` | reservados ao logo e ao estado de sucesso |
| amarelo ou creme dominante | assinatura visual do Zocdoc |
| jaleco + estetoscópio como "a marca" | somos marketplace, não prestador do ato médico |
| receita, medicamento ou diagnóstico legível | conteúdo clínico exige cuidado regulatório |

## Paleta

Cobalto `#3B5BA5` como cor principal. Apoio: `#7E9AD4`, `#DCE5F5`, fundo
`#F2F5FB`, branco, e **terracota `#E4744F`** como único acento quente. Peles em
tons variados — o público é brasileiro.

Prefira arte **editável (SVG/AI/EPS)**: o cobalto precisa bater com o do site, e
banco de imagem raramente acerta de primeira.

## Formato

- proporção próxima de **3:2** (a caixa no código é 3/2 com `object-contain`,
  então proporção diferente não corta — só deixa margem)
- **fundo transparente** de verdade. A arte provisória veio com o xadrez
  *pintado* dentro, em RGB sem canal alfa; foi preciso recortar na mão
- exportar em WebP para produção. O PNG provisório tem 1,0 MB, peso alto demais
  para a primeira imagem que o visitante carrega

## Onde comprar

| fonte | licença | observação |
|---|---|---|
| [unDraw](https://undraw.co) | grátis, uso comercial, sem atribuição, edição permitida — [termos](https://undraw.co/license) | **a cor de acento é configurável**: dá para exportar já no nosso cobalto. Proíbe usar os assets para treinar IA e redistribuí-los em pacote |
| [Adobe Stock](https://stock.adobe.com) · [iStock](https://www.istockphoto.com) | royalty-free, paga | acervo maior e vetor editável; conferir se o arquivo é EPS/AI e não só JPG |
| ilustrador contratado | contrato próprio | exija **cessão de direitos patrimoniais** por escrito, senão a arte não é da empresa |

Verifiquei os termos do unDraw diretamente. Nos pagos, confira a licença no ato
da compra: o que vale é a que estiver vigente naquele dia.

## Como trocar a arte no código

Em `src/pages/HomePage.jsx`, duas constantes no topo:

```js
const HERO_ARTE = '/hero/arquivo.webp';
const HERO_ALVO = { x: '79.8%', y: '80%' };
```

`HERO_ALVO` é o ponto para onde a arte aponta — o botão "Agendar Consulta" é
ancorado nele. Meça no arquivo: localize a ponta do dedo (ou o foco da cena) em
px e divida pela largura e pela altura da imagem. Em porcentagem, e não em px,
para o encaixe acompanhar o redimensionamento.

A caixa usa `object-contain`, então **a arte nunca é cortada** — se a proporção
não for 3:2, sobra margem. Margem é melhor que dedo cortado.
