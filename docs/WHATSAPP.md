# WhatsApp da aviDoc — os três disparos

Um número, três funções. Todas saem do mesmo remetente na Cloud API da Meta e
todas exigem **modelo aprovado**, cada uma o seu.

| # | Quando dispara | Para quem | Modelo | Categoria |
|---|---|---|---|---|
| 1 | Cadastro ou agendamento, ao confirmar identidade | Paciente | `codigo_verificacao` | **Autenticação** |
| 2 | Pagamento aprovado | Médico | `novo_agendamento_medico` | Utilidade |
| 3 | Pagamento aprovado | Paciente | `agendamento_confirmado_paciente` | Utilidade |

Os três modelos estão escritos abaixo, prontos para copiar. **Cadastre os três
antes de ligar qualquer coisa** — a Meta aprova cada um separadamente, e o
código não entrega nada enquanto o modelo correspondente não existir.

### Atalho: criar os três por API

Em vez de preencher os formulários, um comando faz os três com o texto exato
que o código envia:

```bash
export META_WA_TOKEN='...'   # token de usuário do sistema
export META_WABA_ID='...'    # ID da CONTA comercial, não o do número
node tools/criar-modelos-whatsapp.mjs
```

O script não guarda credencial em lugar nenhum e pode ser rodado de novo:
modelo que já existe volta como "já existia" e ele segue para o próximo.

⚠️ `META_WABA_ID` é o ID da **conta**; `META_WA_PHONE_ID` (o que vai no
Supabase) é o do **número**. Trocar um pelo outro dá erro 100 sem dizer qual
campo está errado.

### Sobre o MCP de ferramentas da Meta

O servidor MCP de ferramentas para desenvolvedores (`mcp.facebook.com/devtools`)
**não cria modelos de mensagem**. A documentação é explícita: o único recurso de
escrita é assinatura de webhook; todo o resto é somente leitura — configuração
do app, status de análise, integridade da API, conformidade.

Vale conectar por outro motivo: acompanhar o status da análise do app e a saúde
da API sem abrir o painel. Para os modelos, o caminho é o script acima ou o
WhatsApp Manager.

> Uma conta de WhatsApp Business nova começa com limite de 250 conversas
> iniciadas por 24h. Para o volume atual sobra; vale saber que o limite existe
> e sobe sozinho conforme a qualidade do número.

---

## Modelo 1 — código de verificação

**Categoria Autenticação**, que é diferente das outras duas: a Meta impõe o
formato, não deixa escrever o corpo livremente e entrega com o botão de copiar
o código. É também a categoria mais barata e a que aprova mais rápido, porque
o texto é padronizado por eles.

No **WhatsApp Manager → Modelos de mensagem → Criar modelo**:

| campo | valor |
|---|---|
| Nome | `codigo_verificacao` |
| Categoria | **Autenticação** |
| Idioma | Português (BR) |

Nas opções do modelo de autenticação, marque:

- **Adicionar botão de copiar código** — é ele que faz o código virar um toque
  em vez de digitação;
- **Aviso de segurança** ("Não compartilhe este código") — opcional na Meta,
  recomendado aqui: é uma mensagem sobre identidade, e o golpe mais comum no
  Brasil é justamente pedir o código por telefone;
- **Validade do código: 10 minutos**, para bater com o que a função aplica.

O corpo é gerado pela Meta. A função envia **uma variável** — o código — no
corpo e a mesma no botão. Se você mudar a validade no modelo, mude também
`MINUTOS_CODIGO` em `verificar-telefone`, senão a mensagem promete um prazo e o
servidor pratica outro.

---

## Modelo 3 — confirmação para o paciente

| campo | valor |
|---|---|
| Nome | `agendamento_confirmado_paciente` |
| Categoria | **Utilidade** |
| Idioma | Português (BR) |

Corpo, exatamente assim:

```
Oi, {{1}}! Sua consulta está confirmada.

Profissional: {{2}}
Data: {{3}} às {{4}}
Protocolo: {{5}}

O profissional entra em contato por este WhatsApp no horário marcado. Guarde esta mensagem.
```

Ordem das variáveis, igual à do array `variaveis` em
`notify-patient-appointment`:

| variável | conteúdo | exemplo para a revisão |
|---|---|---|
| `{{1}}` | primeiro nome do paciente | `Maria` |
| `{{2}}` | nome público do profissional | `Dr. Ryan de Brito` |
| `{{3}}` | data | `12/08/2026` |
| `{{4}}` | hora | `14:30` |
| `{{5}}` | protocolo | `AVD-2026-0812-0001` |

**Por que esta é a mensagem que mais importa das três:** é a única que a pessoa
está esperando. Ela acabou de pagar e quer saber que o horário é dela. Se não
chegar, ela liga no suporte — ou paga de novo achando que não deu certo.

A última linha não é enfeite: ela diz por onde o atendimento vem. Sem isso, o
paciente fica esperando um link que não existe.

---

## Modelo 2 — aviso ao médico

Quando um agendamento é **pago**, o médico recebe um WhatsApp com paciente, data,
hora e protocolo.

## Os dois números, e por que são dois

| número | papel | onde vive |
|---|---|---|
| **+55 33 93618-1034** | suporte, conversa com gente | app do WhatsApp, normal |
| **+55 33 93618-1057** | disparo automático dos avisos | Cloud API da Meta |

Não é preferência, é imposição técnica: ao entrar na Cloud API o número **para
de funcionar no aplicativo**. Um número só teria que escolher entre atender
pessoas e disparar aviso — não dá para as duas coisas.

O 1034 é o que aparece no site como contato e é o que responde paciente e
médico. O 1057 é o robô: só envia, e quem responder a ele não é lido por
ninguém. Se um dia alguém quiser "aproveitar" o 1057 para atendimento, ou migrar
o 1034 para a API, é este parágrafo que explica por que não.

> ✅ O 1057 foi registrado na Meta em 7 de agosto de 2026 e está **Conectado**.
> O ambiente de teste descrito adiante continua valendo como alternativa, mas já
> não é necessário.

O código está pronto e desligado. Ele só liga quando os segredos da Meta
existirem — sem eles a função registra no log o que teria enviado e devolve
`enviado: false`, sem quebrar o agendamento.

---

## O que manda no desenho: o modelo aprovado

A Cloud API da Meta **não aceita texto livre** numa mensagem iniciada pela
empresa. Texto livre só vale nas 24 horas seguintes a a pessoa escrever para o
número, e o médico não escreve para o bot antes de ser avisado.

Consequência prática: a função não monta uma frase, monta uma **lista ordenada
de variáveis** que a Meta encaixa num modelo previamente aprovado. Se o modelo
não existir, ou o nome não bater, nada é entregue.

## 1. Cadastrar o modelo

No **WhatsApp Manager → Modelos de mensagem → Criar modelo**:

| campo | valor |
|---|---|
| Nome | `novo_agendamento_medico` |
| Categoria | **Utilidade** (não Marketing — utilidade é mais barata e aprova mais fácil) |
| Idioma | Português (BR) |

Corpo, exatamente assim:

```
Novo agendamento confirmado no aviDoc.

Paciente: {{1}}
Data: {{2}} às {{3}}
Protocolo: {{4}}

Os detalhes estão no seu painel.
```

A ordem das variáveis é a mesma do array `variaveis` na função. **Trocar a ordem
em um dos dois lados não dá erro nenhum** — entrega uma mensagem com a data no
lugar do nome do paciente.

Três regras da Meta que reprovam o modelo se forem quebradas: o corpo não pode
começar nem terminar com variável, não pode ter duas variáveis coladas, e nenhum
valor pode conter quebra de linha (a função já limpa isso).

Exemplos para a revisão (a Meta pede): `Maria Souza`, `12/08/2026`, `14:30`,
`AVD-2026-0812-0001`.

## 2. Segredos no Supabase

Em **Project Settings → Edge Functions → Secrets**:

| segredo | onde acha | obrigatório |
|---|---|---|
| `META_WA_TOKEN` | token de acesso permanente do usuário do sistema | sim |
| `META_WA_PHONE_ID` | WhatsApp Manager → o **ID do número**, não o número | sim |
| `META_WA_TEMPLATE` | modelo do aviso ao médico | não (padrão `novo_agendamento_medico`) |
| `META_WA_TEMPLATE_PACIENTE` | modelo da confirmação ao paciente | não (padrão `agendamento_confirmado_paciente`) |
| `META_WA_TEMPLATE_OTP` | modelo do código de verificação | não (padrão `codigo_verificacao`) |
| `TELEFONE_PEPPER` | sal do hash de telefone (ver VERIFICACAO-TELEFONE.md) | sim, para a verificação |
| `CANAL_VERIFICACAO` | `whatsapp` ou `email` | não (padrão `whatsapp`) |
| `META_WA_LANG` | código do idioma | não (padrão `pt_BR`) |
| `META_WA_API_VERSION` | versão da Graph API | não (padrão `v21.0`) |

Use **token permanente de usuário do sistema**, não o token de teste do painel:
o de teste expira em 24 horas e o aviso morre em silêncio no dia seguinte.

> O número que entra aqui é o **1057**, nunca o 1034 do suporte — ver "Os dois
> números" no topo. Ele não pode estar ativo no app do WhatsApp ou do WhatsApp
> Business: ao entrar na API é migrado, e o app deixa de funcionar nele.

## Ambiente de teste

A Meta cria sozinha uma "Test WhatsApp Business Account" com um número
americano de teste. Ele serve para validar o caminho inteiro — modelo aprovado,
agendamento pago, mensagem chegando — **antes** de mexer no 1057 e sem esperar
verificação nenhuma.

Duas limitações do sandbox, e as duas são por desenho:

- só entrega para **até 5 números cadastrados como destinatários de teste** (o
  1034 é o candidato natural, já que está num aparelho de verdade);
- quem recebe vê um número americano como remetente, não a marca.

Para usar: pegue o **ID do número de teste** na tela *Configuração da API* do app
e ponha em `META_WA_PHONE_ID`. Quando o 1057 estiver registrado, troque só esse
segredo — nenhuma linha de código muda.

## 3. Rodar o SQL

`supabase/sql/whatsapp-medico.sql` — cria o índice que impede aviso duplicado.
Sem ele o sistema funciona, mas uma reentrega do webhook do Asaas no mesmo
segundo pode mandar a mesma consulta duas vezes.

## 4. Publicar as funções

```bash
supabase functions deploy notify-doctor-new-appointment
supabase functions deploy notify-patient-appointment
supabase functions deploy verificar-telefone
supabase functions deploy asaas-webhook
```

O webhook entra na lista porque é ele quem dispara os dois avisos de
agendamento — e agora chama duas funções, não uma.

---

## Como funciona por dentro

```
Asaas confirma pagamento
   └─ asaas-webhook  ── PATCH condicional (pendente → pago)
        └─ mudou 1 linha?  ── sim ──> notify-doctor-new-appointment
                                        └─ Meta Cloud API ──> WhatsApp do médico
```

**O gatilho é o webhook, não o navegador.** Antes a chamada saía da tela de
confirmação do paciente; quem fechava a aba, ou pagava um Pix duas horas depois,
deixava o médico com uma consulta na agenda sem nunca ter sido avisado.

**Aviso duplicado é barrado em dois pontos.** O `PATCH` só afeta linha na
transição de verdade (o Asaas reenvia o evento quando não recebe 200), e o
índice único parcial em `agendamento_logs` fecha a janela entre "conferi que não
foi enviado" e "enviei".

**Falha de aviso nunca derruba o pagamento.** A chamada é best-effort com
`catch` vazio, de propósito: se o webhook responder erro, o Asaas reenvia o
evento e o risco passa a ser pagamento processado duas vezes. Aviso perdido é
ruim; cobrança bagunçada é pior.

## Onde olhar quando não chegar

Tudo cai em `agendamento_logs`, com as consultas prontas no rodapé do
`whatsapp-medico.sql`:

| ação | significa |
|---|---|
| `whatsapp_medico_enviado` | entregue à Meta; `dados.message_id` é o rastro dela |
| `whatsapp_medico_falhou` | a Meta recusou; `dados.detalhe` traz o código |
| `whatsapp_medico_sem_telefone` | o médico não tem WhatsApp válido no cadastro |

Códigos da Meta que aparecem com mais frequência:

- **131047** — janela de 24h; só acontece se alguém trocar o modelo por texto livre.
- **132001** — o modelo não existe com esse nome/idioma. Confira `META_WA_TEMPLATE` e `META_WA_LANG`.
- **132000** — número de variáveis diferente do que o modelo espera.
- **190** — token expirado (quase sempre é o token de teste de 24h).

## O que ainda não existe

- Aviso ao médico quando o paciente **cancela**.
- Lembrete antes da consulta.
- Reenvio manual pelo admin quando o log mostra falha.
- Recebimento de respostas (o médico responder ao aviso não faz nada hoje).

---

# Do token ao primeiro disparo — na ordem

Cada etapa depende da anterior. Pular uma faz a seguinte falhar em silêncio,
que é o modo de falha mais caro aqui.

## Etapa 0 — o token é o permanente?

**É a causa nº 1 de "funcionou ontem e hoje não".** O token que aparece na tela
*Configuração da API* do app é temporário: vale **24 horas**. Quem usa ele vê
tudo funcionar no dia do teste e descobre no dia seguinte, com um paciente sem
confirmação.

O que serve é o token de **usuário do sistema**:

1. **Gerenciador de Negócios → Configurações do negócio → Usuários → Usuários do sistema**
2. Criar (ou usar) um usuário do sistema com função de administrador
3. **Adicionar ativos** → o app e a conta do WhatsApp, com controle total
4. **Gerar novo token** → escolher o app → marcar as permissões:
   - `whatsapp_business_messaging` (enviar mensagem)
   - `whatsapp_business_management` (criar modelo)
5. Em validade, escolher **Nunca expira**

Se o seu token veio da tela de Configuração da API, refaça por aqui antes de
seguir. Os dois parecem iguais e só um sobrevive à semana.

## Etapa 1 — os dois IDs

Já levantados no Gerenciador do WhatsApp em 7 de agosto de 2026:

| valor | ID | onde conferir |
|---|---|---|
| **WABA ID** — conta `aviDoc` | `1407190781284781` | Gerenciador do WhatsApp → seletor de conta |
| **Phone Number ID** — número +55 33 93618-1057 | `1229716980229241` | Telefones → clicar no número → "Identificação do número de telefone" |

Nenhum dos dois é o número de telefone, e eles não são intercambiáveis: trocar
um pelo outro devolve erro 100 sem dizer qual campo está errado.

> Existe também uma **Test WhatsApp Business Account** (`1532311201523493`), com
> número americano e limite de 5 destinatários. Não é essa que vai em produção —
> confira o seletor de conta antes de copiar qualquer ID.

**Estado do número:** Conectado, nome de exibição `aviDoc`. Pronto para enviar
assim que houver modelo aprovado.

## Etapa 2 — criar os três modelos

```bash
export META_WA_TOKEN='o token do usuário do sistema'
export META_WABA_ID='1407190781284781'
node tools/criar-modelos-whatsapp.mjs
```

Saída esperada: três linhas com ✓. Se alguma vier ✗, o texto do erro diz o
motivo — quase sempre redação.

## Etapa 3 — esperar a aprovação

WhatsApp Manager → Modelos de mensagem. Os três precisam estar **Ativo**.
Costuma sair em minutos; autenticação costuma ser o mais rápido, por ser
formato padronizado da Meta.

**Enquanto um modelo estiver em análise, ele não entrega nada.** A função
registra a recusa no log e devolve `enviado: false` — não trava, mas também não
chega.

## Etapa 4 — os segredos no Supabase

**Project Settings → Edge Functions → Secrets**:

| segredo | valor |
|---|---|
| `META_WA_TOKEN` | o token do usuário do sistema |
| `META_WA_PHONE_ID` | `1229716980229241` |
| `TELEFONE_PEPPER` | qualquer texto longo e aleatório — **escolha uma vez e nunca troque** |
| `CANAL_VERIFICACAO` | `whatsapp` |

O `TELEFONE_PEPPER` é o sal do hash de telefone. Trocá-lo depois invalida todos
os hashes existentes, e com eles a regra de "um número, uma avaliação".

Segredo novo só vale para invocação nova — não precisa republicar função.

## Etapa 5 — o primeiro disparo de verdade

**Use `/avaliar`, não o agendamento.** Essa tela não depende da flag, não
envolve dinheiro e exercita o caminho inteiro: gerar código → Meta → seu
celular → conferir.

1. Abra `https://avidoc.com.br/avaliar/<slug-do-medico>`
2. Preencha nota, texto (50+ caracteres), nome e local
3. No fim, digite **o seu próprio celular** e peça o código
4. O WhatsApp deve chegar em segundos, com botão de copiar

Não chegou? O log diz por quê:

```bash
npx supabase@latest functions logs verificar-telefone --project-ref fnzvopspcoefzybtmwlg
```

| o que o log diz | o que é |
|---|---|
| `META_WA_TOKEN/META_WA_PHONE_ID ausentes` | segredo não salvo |
| `template name does not exist` | modelo ainda em análise, ou nome diferente |
| `(#131030) recipient not in allowed list` | conta ainda em modo de teste; cadastre o número em destinatários |
| `(#100)` | provavelmente WABA ID no lugar do Phone Number ID |

Se você concluir o envio, a avaliação entra na fila de moderação — apague depois
pelo painel de Avaliações para não deixar teste no ar.

## Etapa 6 — os dois avisos de agendamento

Esses só disparam quando um pagamento é confirmado de verdade, pelo webhook do
Asaas. O teste honesto é **um agendamento real seu**: marque com um dos
profissionais, pague o Pix e confira se chegam as duas mensagens — a sua, de
confirmação, e a do médico.

Custa o valor de uma consulta e testa a corrente inteira: Asaas → webhook →
médico + paciente + e-mail. Nenhum simulacro cobre isso, porque o gatilho é o
pagamento.

## Etapa 7 — só então, a flag

Com o código chegando, ligue `VERIFICACAO_TELEFONE` em `src/config/features.js`
e publique. A partir daí o cadastro e a revisão do agendamento passam a exigir
a confirmação.

**Nessa ordem.** Ligar antes de o código chegar trava o agendamento — já
aconteceu uma vez.

## Dois limites, medidos na conta em 7 de agosto de 2026

- **0 de 250 conversas iniciadas** por 24 h. Sobe sozinho conforme a qualidade
  do número.
- **Empresa ainda não verificada.** O painel mostra "Verifique sua empresa" como
  caminho para passar de 2.000 conversas. Para o volume de agora sobra; antes do
  primeiro mês de anúncio, não — e a verificação leva dias, então vale iniciar
  cedo.

---

# O que travou na primeira tentativa (7 de agosto de 2026)

Tentei criar os três modelos pelo Gerenciador do WhatsApp. Vale registrar o
resultado, porque duas coisas custam tempo se descobertas de novo.

## O modelo de Autenticação foi RECUSADO

> **Não é possível criar o modelo de mensagem**
> Esta conta do WhatsApp Business não tem permissão para criar um modelo de
> mensagem

Não é erro de formulário: o modelo estava correto — nome, `pt_BR`, copiar
código, aviso de segurança, expiração de 10 minutos, tudo conferido na prévia.
É permissão de conta.

**O que foi descartado como causa:** forma de pagamento. A conta `aviDoc` tem
cartão cadastrado (a *Test WhatsApp Business Account* é que não tem — não
confunda as duas no painel de cobrança).

**O que sobra:** a empresa **não está verificada**, e a documentação de terceiros
sobre a plataforma é consistente em que modelo da categoria **Autenticação exige
verificação da empresa**. É o caminho a seguir: Gerenciador de Negócios →
Central de Verificações. Leva dias.

> ✅ **CONFIRMADO em 7 de agosto de 2026.** Pela API, com o ativo atribuído e
> token novo, os dois modelos de **Utilidade** entraram como `PENDING` e só o
> `codigo_verificacao` repetiu a recusa. Ou seja: o bloqueio é da categoria
> Autenticação, e não da conta inteira nem do texto.

**Consequência prática:** enquanto a verificação não sair, a verificação por
código no WhatsApp não sobe. É exatamente o caso em que o canal `email` serve de
ponte — ver VERIFICACAO-TELEFONE.md.

Os dois modelos de **Utilidade** (aviso ao médico e confirmação ao paciente)
passam normalmente — foi o que aconteceu.

## O outro tropeço: o ativo não atribuído ao usuário do sistema

Antes disso, a API recusava os TRÊS com:

> Object with ID '1407190781284781' does not exist, cannot be loaded due to
> missing permissions, or does not support this operation

Não era o ID. O usuário do sistema tinha o **App** atribuído, mas **não a conta
do WhatsApp** — são atribuições separadas no painel, e é o passo que quase todo
mundo pula. O conserto:

**Configurações do negócio → Usuários do sistema → ⋯ → Atribuir ativos →
Contas do WhatsApp → aviDoc → controle total.**

E então **gerar um token novo**: o token emitido antes da atribuição não ganha o
acesso retroativamente. Foi isso que destravou os dois de Utilidade.

## O editor do painel corrompe `{{n}}` quando preenchido por automação

Ao digitar `{{`, o editor fecha as chaves sozinho. `{{1}}` vira `{{1}}1}}` e
`{{1` vira `{{1}}1`. Na prévia dá para ver o estrago.

Isso não acontece pela API. **É a razão prática para preferir
`tools/criar-modelos-whatsapp.mjs`** ao formulário: o JSON vai exato, sem editor
no meio. Se for preencher à mão, digite o texto sem as variáveis e use o botão
"Adicionar variável" para cada uma.
