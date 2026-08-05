# Aviso ao médico por WhatsApp

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

> O 1057 ainda não está registrado na Meta. Enquanto não estiver, os testes
> correm no número de teste que a Meta fornece (ver "Ambiente de teste").

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
| `META_WA_TEMPLATE` | nome do modelo | não (padrão `novo_agendamento_medico`) |
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
supabase functions deploy asaas-webhook
```

As duas: o webhook mudou junto, porque é ele quem dispara o aviso.

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
