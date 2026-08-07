# Verificação por código no WhatsApp — como ligar

O código está pronto e **não funciona até três coisas serem configuradas**.
Enquanto elas faltam, o comportamento é honesto e não silencioso: a pessoa vê
"O envio por WhatsApp ainda não está ativo nesta instalação", e o código gerado
aparece no log da função — dá para testar o fluxo inteiro sem enviar mensagem.

## ✅ 1. Rodar o SQL — FEITO em 7 de agosto de 2026

Conferido pela API: as colunas novas de `avaliacoes` respondem, a
`verificacoes_telefone` existe e nega leitura ao anon (que é o esperado), e
`perfis_usuarios.whatsapp_verificado_em` existe.

<details><summary>O que o SQL criou</summary>

`supabase/sql/verificacao-telefone.sql`, no SQL Editor. Ele cria:

- a tabela `verificacoes_telefone` (sem política de RLS: só a service_role
  acessa, de dentro das funções);
- as colunas de avaliação aberta em `avaliacoes` — `origem`, `telefone_hash`,
  `autor_nome` e os três campos de aceite;
- o índice único que impede o mesmo número de avaliar duas vezes o mesmo
  profissional;
- `perfis_usuarios.whatsapp_verificado_em` e o gatilho que a preenche quando a
  conta nasce.

</details>

## ✅ 2. Publicar as duas funções — FEITO em 7 de agosto de 2026

`verificar-telefone` e `avaliacao-publica` estão publicadas e testadas contra o
projeto:

- número inválido → recusa com mensagem em português;
- número válido → gera o código e responde `enviado: false` (sem provedor, e
  dizendo isso em vez de fingir);
- código errado → recusa;
- comprovante forjado na `avaliacao-publica` → recusa.

## 3. O provedor — ESTE É O QUE FALTA

Sem provedor nenhum, o código é gerado e fica só no log da função. É o único
passo entre o que está pronto e o que funciona de verdade.

SMS foi avaliado e **descartado**: exigiria mais uma conta de provedor e, no
Brasil, custa mais que a conversa de autenticação do WhatsApp. O caminho é
WhatsApp, com o e-mail servindo de ponte até o modelo ser aprovado.

### Variável obrigatória, qualquer que seja o canal

| Variável | Para quê |
|---|---|
| `TELEFONE_PEPPER` | Sal do hash do telefone. **Escolha uma vez e nunca troque** — trocar invalida todos os hashes existentes, e com eles a regra de "um número, uma avaliação". |
| `CANAL_VERIFICACAO` | `whatsapp` (padrão) ou `email`. |

### Caminho A — E-mail (Resend) · funciona hoje

`CANAL_VERIFICACAO=email` mais `TELEFONE_PEPPER`. O `RESEND_API_KEY` já existe
no projeto, usado pelos avisos de agendamento — nenhuma conta nova.

**O que ele resolve e o que não resolve.** Confirma que a pessoa controla aquela
caixa de e-mail. Não confirma que o telefone digitado está certo, que é o motivo
de tudo isto existir: é para esse número que o médico liga. Serve de ponte até o
WhatsApp entrar, e serve só no cadastro — na avaliação pública ninguém informa
e-mail, e conta de e-mail é gratuita e infinita, o que faria dela uma barreira de
mentira contra avaliação falsa.

### Caminho B — WhatsApp (Meta) · o destino

| Variável | Onde achar |
|---|---|
| `META_WA_TOKEN` | Já usado pela `notify-doctor-new-appointment` |
| `META_WA_PHONE_ID` | **O mesmo número que avisa os médicos serve.** Um número envia quantos modelos diferentes existirem; o que não se reaproveita é o modelo em si |
| `META_WA_TEMPLATE_OTP` | Nome do modelo. Padrão: `codigo_verificacao` |

**Exige modelo aprovado antes.** O passo a passo do cadastro, com as opções a
marcar, está em `docs/WHATSAPP.md` — que agora cobre os três disparos do
número: código de verificação, aviso ao médico e confirmação ao paciente.

## 4. Ligar a flag — POR ÚLTIMO

`FEATURES.VERIFICACAO_TELEFONE` em `src/config/features.js` nasce `false`.

**Não ligue antes de um código chegar de verdade no seu celular.** Com ela
ligada e sem provedor, a tela de revisão exige um código que ninguém recebe e o
agendamento para. Foi exatamente o que aconteceu uma vez.

## Custo, que é o que decide se isso escala

Conversa de autenticação no WhatsApp Cloud API é cobrada por mensagem. Numa
consulta de R$ 65, cada código pesa — e o formulário público é, por natureza,
aberto a qualquer pessoa.

Três defesas já estão no código:

- **3 envios por hora por número.** Sem isso, o formulário vira uma torneira de
  mensagens pagas apontada para o número que o atacante escolher.
- **5 tentativas por código**, depois é preciso pedir outro.
- **Código válido por 10 minutos**, comprovante por 30.

Vale acompanhar o gasto nas primeiras semanas. Se crescer demais, o passo
seguinte é exigir o Turnstile antes do envio — o widget já existe no projeto,
usado no cadastro.

## O que verificar depois de ligar

1. Pedir código para um número seu e conferir que a mensagem chega.
2. Errar o código de propósito cinco vezes e confirmar o bloqueio.
3. Enviar uma avaliação pelo formulário público e conferir que ela nasce
   **pendente** — nada é publicado sozinho.
4. Tentar avaliar o mesmo profissional de novo com o mesmo número: precisa
   recusar com "Você já avaliou este profissional".
5. Criar uma conta de teste e conferir `perfis_usuarios.whatsapp_verificado_em`
   preenchido.

## A decisão que ficou em aberto

A verificação no cadastro é **obrigatória** hoje: sem confirmar o WhatsApp, o
botão de criar conta não libera. É o que dá a identidade mais forte, e foi o que
se pediu.

Mas é um passo a mais no funil, exatamente onde a pessoa está tentando agendar —
e o cadastro já é o ponto de maior perda. Acompanhe a taxa de conclusão nas
primeiras semanas. Se cair de forma relevante, a alternativa é deixar a
verificação opcional no cadastro e obrigatória só na avaliação, onde a fraude é
o risco real.


## Onde a verificação é exigida hoje

| Lugar | Exigência | Por quê |
|---|---|---|
| Cadastro de paciente | **Obrigatória** | Identidade da conta |
| Revisão do agendamento | **Obrigatória** | O médico liga para este número |
| Avaliação pública | **Obrigatória** | Encarece a fraude em escala |
| Avaliação pelo painel do paciente | Não | O vínculo com a consulta paga já prova mais |

A da revisão do agendamento é a que pega as contas antigas e quem trocou de
número — quem se cadastra a partir de agora já chega confirmado.
