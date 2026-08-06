# Ilustrações e ícones

Duas coisas diferentes, e confundir uma com a outra é o que faz interface
parecer montada em série:

- **Ilustração** — desenho grande, decorativo, uma por tela. Storyset.
- **Ícone** — sinal pequeno ao lado de um texto ou dentro de um botão. lucide.

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

### O que evitar ao escolher

Texto em inglês desenhado como vetor não dá para traduzir sem redesenhar.
Descarte a arte se ele for legível no tamanho em que vai aparecer —
`CERTIFICATION`, `WELCOME`, `PAGE NOT FOUND` e `MONTHLY SCHEDULE` já saíram por
isso. Cuide também do que a cena diz: uma videochamada entre duas pessoas sem
jaleco não é consulta, e um calendário com **X** nos dias contradiz "7 dias por
semana".

---

## Ícones

**[lucide-react](https://lucide.dev)**, importado por nome — o bundler descarta o
que não é usado, então acrescentar um ícone não pesa no pacote.

### Vocabulário

Um significado, um ícone. Quando o mesmo estado é desenhado de dois jeitos, o
produto parece feito por duas pessoas que não se falaram.

| significado | ícone | não use |
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
("isto vai cobrar taxa"), círculo é falha ("não foi possível salvar"). Trocar um
pelo outro em massa seria mentir sobre a gravidade.

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

### Botão só com ícone

Sempre com `aria-label`. Sem ele o leitor de tela anuncia apenas "botão", e quem
depende disso não tem como saber o que ele faz.

```jsx
<Button aria-label="Copiar a chave de verificação" size="icon" onClick={copiar}>
  <Copy className="h-4 w-4" />
</Button>
```

O rótulo é **verbo + objeto**, não o nome do ícone: "Abrir o prontuário", e não
"Seta". Ícone puramente decorativo, ao lado de um texto que já diz a mesma
coisa, leva `aria-hidden="true"` — repetir a informação só atrapalha.

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
