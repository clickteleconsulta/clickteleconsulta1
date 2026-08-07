# Verificação por código no WhatsApp — como ligar

O código está pronto e **não funciona até três coisas serem configuradas**.
Enquanto elas faltam, o comportamento é honesto e não silencioso: a pessoa vê
"O envio por WhatsApp ainda não está ativo nesta instalação", e o código gerado
aparece no log da função — dá para testar o fluxo inteiro sem enviar mensagem.

## 1. Rodar o SQL

`supabase/sql/verificacao-telefone.sql`, no SQL Editor. Ele cria:

- a tabela `verificacoes_telefone` (sem política de RLS: só a service_role
  acessa, de dentro das funções);
- as colunas de avaliação aberta em `avaliacoes` — `origem`, `telefone_hash`,
  `autor_nome` e os três campos de aceite;
- o índice único que impede o mesmo número de avaliar duas vezes o mesmo
  profissional;
- `perfis_usuarios.whatsapp_verificado_em` e o gatilho que a preenche quando a
  conta nasce.

## 2. Publicar as duas funções

```bash
supabase functions deploy verificar-telefone
supabase functions deploy avaliacao-publica
```

## 3. As variáveis de ambiente

| Variável | Para quê |
|---|---|
| `TELEFONE_PEPPER` | Sal do hash do telefone. **Escolha uma vez e nunca troque** — trocar invalida todos os hashes existentes, e com eles a regra de "um número, uma avaliação". |
| `META_WA_TOKEN` | Token da Meta. Já usado pela `notify-doctor-new-appointment`. |
| `META_WA_PHONE_ID` | Número remetente no WhatsApp Cloud API. Idem. |
| `META_WA_TEMPLATE_OTP` | Nome do modelo de autenticação. Padrão: `codigo_verificacao`. |

### O modelo precisa ser aprovado antes

Mensagem iniciada pela empresa no WhatsApp Cloud API **só sai por modelo
aprovado**. Para código, a Meta exige a categoria **AUTENTICAÇÃO**, que tem
formato próprio: corpo com a variável do código e um botão de copiar. Cadastre no
Gerenciador do WhatsApp, em português (`pt_BR`), e espere a aprovação — costuma
levar de minutos a algumas horas.

Sem o modelo aprovado, a Meta recusa o envio e a função registra o motivo no log.
Ela **não finge que enviou**.

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
