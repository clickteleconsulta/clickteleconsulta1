# Ilustrações e ícones

Duas coisas diferentes, e confundir uma com a outra é o que faz interface
parecer montada em série:

- **Ilustração** — desenho grande, decorativo, uma por tela. Storyset.
- **Ícone** — sinal pequeno ao lado de um texto ou dentro de um botão. Uicons.

Ilustração no lugar de ícone deixa a tela infantil. Ícone no lugar de ilustração
deixa a tela com cara de erro.

---

## Ilustrações

Vêm do **[Storyset](https://storyset.com)**, estilo **cuate**, recoloridas para a
marca. Ficam em `public/ilustra/`, uma por lugar onde aparecem.

Antes eram do unDraw e foram trocadas inteiras. O traço do unDraw é econômico
demais — figura sem rosto, poucos elementos, muito branco — e ampliado no
cabeçalho da home lê como desenho incompleto. O cuate tem cena e detalhe.

Duas artes são **as mesmas dos anúncios**, de propósito: `heroi.svg` é a peça
"A partir de R$ 40" e `secao-escolher.svg` é a "Você escolhe o médico". Quem
clica no anúncio reencontra o desenho na página inicial, e não sente que caiu em
outro lugar.

### Quem usa o quê

| arquivo | onde aparece |
|---|---|
| `heroi.svg` | topo da home |
| `secao-escolher.svg` | home — escolha o médico |
| `secao-avaliacoes.svg` | home — avaliações |
| `secao-documentos.svg` | home — documentos |
| `quem-somos.svg` | Quem somos |
| `faq.svg` | Perguntas frequentes |
| `suporte.svg` | Suporte |
| `nao-achou.svg` | página 404 |
| `cookies.svg` | banner de consentimento |
| `acesso-cliente.svg` | entrar — paciente |
| `acesso-profissional.svg` | entrar — médico |
| `sem-*.svg` | estados vazios, sempre via `<EstadoVazio>` |

### Licença

**Assinatura Flaticon/Freepik ativa** — a atribuição que a licença gratuita
exige deixa de ser obrigatória enquanto a assinatura durar.

Se a assinatura for cancelada, a obrigação volta para **todas** estas artes, e
passa a ser preciso creditar o Storyset no rodapé do site com link. Não é
detalhe: sem assinatura e sem crédito, o uso comercial não está coberto.

### Como acrescentar uma nova

```bash
python3 tools/storyset.py --tudo
```

O mapa fica no próprio `tools/storyset.py`. O script baixa, troca o amarelo do
Storyset (`#ffc727`) pelo cobalto da marca (`#3B5BA5`) e tira as camadas de
fundo. **Não pule a limpeza**: o SVG da API vem com todas as camadas ligadas,
inclusive o fundo decorativo que o editor deles desliga por padrão — sem tirar,
ele vira mancha cinza atrás do desenho e o arquivo fica 5× maior.

Carvão, cinzas e tons de pele **ficam como estão**. São o que dá volume ao
traço; trocar tudo por cobalto achata o desenho, que era exatamente o problema
do unDraw.

### Cor onde o objeto tem cor no mundo real

Tudo em cobalto ficava sem vida. Tudo colorido vira arco-íris e some a marca. A
regra que separa os dois: **só ganha cor própria o que o olho já espera
colorido**.

| objeto | cor | por quê esta e não outra |
|---|---|---|
| folha, planta, árvore | `#0C9769` | é o jade da cruz da marca. **Nunca** o `#16A34A` de sucesso — verde de estado e verde de enfeite precisam ser distintos |
| coração | `#E0483E` | mais quente que o `#DC2626` de erro, pela mesma razão: coração desenhado não é alerta |
| estrela | `#FBBF24` | é o `amber-400` das estrelas de avaliação da interface — a estrela desenhada e a clicável combinam |

Monitor, calendário, pasta, carteira e roupa **continuam cobalto**: a cor real
deles não é informação nenhuma, e colorir por colorir só rouba atenção do que a
peça quer dizer.

A cor entra por **camada**, não por busca de tom — o Storyset nomeia os grupos
(`Plant`, `Heart`, `Stars`), então dá para pintar o objeto certo em vez de torcer
para que nenhuma outra forma use o mesmo hex. Quando o objeto está no grupo
errado (a estrela grande de `sem-avaliacoes` mora dentro do personagem, junto
com o tênis), a regra restringe também o tipo de forma. Tudo em
`CORES_POR_CAMADA` e `CORES_EXTRA`, dentro de `tools/storyset.py`.

**`heroi.svg` é a exceção e fica todo cobalto.** É a primeira coisa que a pessoa
vê e a mesma arte da peça de anúncio principal; ali a marca precisa falar
sozinha, sem concorrência de cor.

### O que evitar ao escolher

Texto em inglês desenhado como vetor não dá para traduzir sem redesenhar.
Descarte a arte se ele for legível no tamanho em que vai aparecer —
`CERTIFICATION`, `WELCOME`, `PAGE NOT FOUND` e `MONTHLY SCHEDULE` já saíram por
isso. Cuide também do que a cena diz: uma videochamada entre duas pessoas sem
jaleco não é consulta, e um calendário com **X** nos dias contradiz "7 dias por
semana".

---

## Ícones

**Uicons (Flaticon)**, estilo **solid / straight**. Não vêm de uma biblioteca
instalada: `tools/gerar-icones.py` extrai os contornos da fonte e emite
`src/components/ui/icones.jsx` com os 160 que o projeto usa.

### Por que não é o pacote npm nem uma webfont

O `@flaticon/flaticon-uicons` pesa 26 MB e entrega os ícones como webfont — uma
família inteira, 3.567 ícones, ~248 KB de woff2 que o navegador baixaria para
usar 160. Num site que precisa abrir rápido no celular de quem está procurando
médico, isso é caro demais por um ganho estético.

Extraídos, custam ~101 bytes por ícone depois do gzip (o lucide custava ~66). A
diferença total é de poucos KB: traço sólido tem menos contorno que o vazado, e
por isso comprime bem.

Os arquivos de entrada ficam em `tools/uicons/` — 464 KB, nunca servidos ao
navegador. A alternativa era uma devDependency de 26 MB ou depender de um
download que pode sair do ar entre uma build e outra.

### Por que saiu o lucide

Não porque fosse ruim: a 16 px, lucide e Uicons **outline** são quase
indistinguíveis, e isso foi medido lado a lado antes de decidir. O que o lucide
não tem é a variante **sólida**. Ícone preenchido carrega mais peso visual, que
é o que faz uma interface parecer acabada em vez de esquemática — e é a
convenção para "item ativo" num menu.

### Como acrescentar um ícone

1. Ache o nome em `tools/uicons/solid-straight.css` (ou `brands.css`).
2. Ponha o par no mapa em `tools/uicons/mapa.json` — a chave é o nome que o
   código vai importar, o valor é a classe do Flaticon.
3. `python3 tools/gerar-icones.py`

Nunca edite `src/components/ui/icones.jsx` à mão: ele é sobrescrito.

### Os nomes são os do lucide

O módulo gerado exporta `User`, `Calendar`, `Loader2`… com os nomes da
biblioteca antiga. Foi assim que a troca em 153 arquivos virou **uma linha de
import por arquivo** em vez de uma reescrita de JSX, que é onde os erros
aparecem. Quem escrever código novo não precisa saber disso — só importar de
`@/components/ui/icones`.

### Vocabulário

Um significado, um ícone. Quando o mesmo estado é desenhado de dois jeitos, o
produto parece feito por duas pessoas que não se falaram.

| significado | importar | não use |
|---|---|---|
| deu certo, confirmado | `CheckCircle2` | `CheckCircle` |
| item marcado numa lista | `Check` | |
| atenção, risco, precisa decidir | `AlertTriangle` | |
| deu errado, falhou | `AlertCircle` | |
| informação neutra | `Info` | |
| editar | `Pencil` | `Edit`, `Edit2` |
| apagar | `Trash2` | `Trash` |
| fechar | `X` | |
| cancelado, recusado | `XCircle` | |
| carregando | `Loader2` + `animate-spin` | |

`AlertTriangle` e `AlertCircle` **não** são intercambiáveis: triângulo é risco
("isto vai cobrar taxa"), círculo é falha ("não foi possível salvar").

### Tamanho

| classe | onde |
|---|---|
| `h-3 w-3` | dentro de badge ou legenda |
| `h-4 w-4` | padrão — botão, tabela, item de menu |
| `h-5 w-5` | título de seção, ícone que carrega significado sozinho |
| `h-8 w-8` | indicador de carregamento em tela cheia |

**Acima de `h-8` a resposta quase sempre é ilustração, não ícone.** Ícone cinza
grande no meio de uma tela vazia parece tela quebrada — é o mesmo desenho de um
erro, no mesmo tom. Use `<EstadoVazio arte="/ilustra/sem-*.svg">`.

`strokeWidth` é aceito e **ignorado**: os ícones são sólidos, não existe traço
para engrossar. A prop continua sendo aceita para não quebrar as chamadas que
ainda a passam por herança do lucide.

### A escala do site subiu junto

Traço cheio a 16 px pede mais respiro em volta do que traço vazado. Por isso
`--zoom-site` foi de 110% para **120% no desktop**, e ficou em **110% no
celular** — o zoom multiplica o tamanho mas não a largura da tela, e a 375 px o
botão "Cadastre-se" encostava na borda (medido: 0 px de folga a 120%, 17,6 px a
110%). Está em `src/index.css`.

### Botão só com ícone

Sempre com `aria-label`. Sem ele o leitor de tela anuncia apenas "botão", e quem
depende disso não tem como saber o que ele faz.

```jsx
<Button aria-label="Copiar a chave de verificação" size="icon" onClick={copiar}>
  <Copy className="h-4 w-4" />
</Button>
```

O rótulo é **verbo + objeto**, não o nome do ícone: "Abrir o prontuário", e não
"Seta". O componente já marca o `<svg>` como `aria-hidden`, então o ícone nunca
é lido duas vezes.

---

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
empresa e não pode ser usada em anúncio pago.
