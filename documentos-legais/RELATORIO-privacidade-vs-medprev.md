<!-- versao: auditoria de 6 de agosto de 2026 -->
# Política de Privacidade: comparação com a Medprev e auditoria da nossa realidade

Comparei a nossa Política (5 páginas, 25/07/2026) com a da Medprev (14 páginas), e
depois fiz o que a comparação não resolve: conferi o que a **nossa plataforma
realmente faz** contra o que a nossa Política declara.

A segunda parte é a que rendeu.

## Parte 1 — O que a Medprev tem e nós não temos

**Nada.** Rodei um diff por tema, e não por texto — não se copia redação de
concorrente. Dos 20 temas verificados, todos os que a Medprev cobre já estão na nossa.

Em três, o nosso cobre mais:

| tema | Medprev | aviDoc |
|---|---|---|
| Transferência internacional de dados | não trata | seção 9 |
| Medidas técnicas de segurança (criptografia, controle de acesso) | genérico | seção 10, com detalhe |
| Trilha de auditoria e imutabilidade dos registros | não trata | seção 11.3 |

A diferença de 14 para 5 páginas é de estilo, não de cobertura: a deles repete
conceitos legais e reescreve trechos da LGPD; a nossa vai direto ao ponto. Documento
mais longo não é documento mais protegido.

### O que falta nos DOIS

Três temas não aparecem em nenhuma das duas. Não são urgentes, mas são o que
diferenciaria a nossa de verdade:

- **Prazo de resposta ao titular.** A LGPD dá prazos para atender pedido de acesso e
  confirmação. Nenhuma das duas políticas assume um prazo por escrito.
- **Decisão automatizada (art. 20).** O direito à revisão de decisão tomada só por
  tratamento automatizado. Hoje a nossa plataforma não toma decisão desse tipo — mas
  se um dia ordenar médicos por algoritmo, passa a tomar.
- **Retenção com prazo concreto.** As duas dizem "pelo tempo necessário"; nenhuma diz
  quanto tempo.

## Parte 2 — O que a nossa Política não declara, e a plataforma faz

Aqui está o achado. Levantei todos os terceiros que o código realmente aciona e
cruzei com a lista nominal da seção 8.

### Certos — estão ligados hoje

**1. Cloudflare Turnstile.** Protege todos os logins contra automação. Para funcionar,
processa o IP e sinais do navegador de **toda pessoa que entra na conta**. Não aparece
na Política. É o mais relevante dos três, porque atinge 100% dos usuários autenticados.

**2. TikTok.** A plataforma envia evento de conversão quando um pagamento é
confirmado — pelo navegador e também pelo servidor, na função `asaas-webhook`. Só com
consentimento no banner, e sem dado pessoal direto. Ainda assim é um destinatário, e
uma plataforma de publicidade não cabe em "provedores de infraestrutura e comunicação".

**3. Identificadores de clique de anúncio.** Capturamos `ttclid`, `fbclid` e `gclid` da
URL de entrada, guardamos por 30 dias no navegador e gravamos junto do agendamento. A
seção 3 lista IP, dispositivo, páginas e cookies — não menciona estes. São dado de
navegação com finalidade publicitária, e merecem estar escritos.

### Condicionais — dependem de variável de ambiente que só você pode conferir

**4. Meta Pixel** e **5. Google Analytics 4.** O código carrega os dois apenas se
`VITE_META_PIXEL_ID` e `VITE_GA4_ID` estiverem preenchidos na Vercel. Se estiverem, são
dois destinatários a mais, no mesmo caso do TikTok. Se não estiverem, não há o que
declarar. **Confira no painel da Vercel antes de decidir.**

### Verificados e sem problema — para não virar trabalho à toa

Estas eu cheguei a levantar como suspeita e descartei depois de conferir:

- **Jitsi / 8x8 (videochamada) e Memed (prescrição)** aparecem no código, mas as
  feature flags `VIDEO_CALL` e `PRONTUARIO` estão **desligadas**. A Política está certa
  ao dizer que a aviDoc não fornece a ferramenta de videochamada. Se um dia ligarem,
  essa frase deixa de ser verdade e os dois viram destinatários de dado sensível.
- **O chat de inteligência artificial do site é local.** Ele lê uma base de respostas
  do próprio banco e casa a pergunta ali mesmo. Nada do que a pessoa escreve sai para
  provedor de IA nenhum. Nada a declarar.
- **Google Calendar** aparece no código sem rota ativa.

## O que recomendo

Uma revisão só, na Política de Privacidade, com quatro pontos — todos para o jurídico
redigir, porque são cláusula:

1. Acrescentar à seção 8 os destinatários confirmados: Cloudflare (proteção antiautomação)
   e TikTok (publicidade e medição), mais Meta e Google se as variáveis estiverem ativas.
2. Acrescentar à seção 3 os identificadores de clique, com a finalidade e o prazo de 30
   dias que já praticamos.
3. Assumir um prazo de resposta ao titular na seção 12.
4. Avaliar se vale já incluir o direito de revisão de decisão automatizada, mesmo sem
   uso hoje, para não precisar republicar quando houver ordenação por algoritmo.

Os Termos de Serviço e o Termo de Adesão **não precisam de alteração** pelo que foi
encontrado aqui. Quando formos analisá-los, o método será o mesmo: comparar com o
concorrente para achar lacuna de tema, e depois comparar com o código para achar
lacuna de realidade — que é onde os problemas de verdade aparecem.
