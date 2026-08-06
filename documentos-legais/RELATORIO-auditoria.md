<!-- versao: auditoria de 6 de agosto de 2026 -->
# Auditoria dos três documentos legais

Documentos analisados, na versão que você enviou:

- **Termos de Serviço** — pacientes · 6 páginas · última atualização 28/07/2026
- **Política de Privacidade** — LGPD · 5 páginas · última atualização 25/07/2026
- **Termo de Adesão** — médicos parceiros · 8 páginas · versão vigente 30/07/2026

## Conclusão

**Não há correção de marca a fazer.** Os três já estão em aviDoc, já usam o domínio
avidoc.com.br, já trazem a data de atualização e já identificam o Asaas pelo nome
jurídico completo. O que eu tinha preparado para "corrigir" não tinha o que corrigir.

Foi encontrada **uma lacuna real**, e ela é de conteúdo, não de forma.

## O que foi verificado, e passou

**A razão social sobreviveu.** Toda ocorrência de "CLICK TELECONSULTA ONLINE LTDA"
nos três documentos é a razão social da empresa — que não muda, porque a empresa é a
mesma. Nenhuma é resíduo de marca antiga. Um substituidor automático de marca teria
corrompido as três.

**O Asaas está identificado como a norma exige.** Os três trazem
"Asaas Gestão Financeira Instituição de Pagamento S.A.", nome jurídico completo, e não
só a marca. Isso cumpre a exigência de transparência do BaaS na parte dos "contratos ou
termos de uso" — que era justamente o ponto que eu não conseguia conferir do lado do
código, porque os documentos vivem no banco.

**Nenhum dos termos proibidos aparece.** Sem "Especialistas", sem "Clínico Geral", sem
uso de "Seguro" no sentido que a LGPD desaconselha, sem promessa de resultado. A única
ocorrência de "garantir resultado" é a cláusula que diz que **não** se garante — ou
seja, protetiva.

**Nenhum documento afirma verificação junto ao CRM.** Isso importa porque o site
afirmava, em nove lugares, até ser corrigido nesta mesma semana. Os documentos já
estavam certos; era o site que divergia deles.

**O posicionamento está correto e explícito.** Os Termos dizem, com todas as letras,
que a aviDoc não presta serviços médicos, não é plano de saúde, convênio ou cartão de
desconto, e não interfere na conduta clínica.

**A imutabilidade dos registros está documentada.** O item 11.3 da Política e o 4.4 dos
Termos descrevem exatamente o que o sistema faz: agendamentos e consultas são mantidos
mesmo após a exclusão da conta, com trilha de auditoria.

## A lacuna encontrada

**A Política de Privacidade não nomeia a plataforma de anúncios entre os destinatários
dos dados.**

A seção 8 lista com quem os dados são compartilhados: o Médico Parceiro, o Asaas, os
provedores de infraestrutura e comunicação, e as autoridades. É uma lista nominal — ela
chega a dar o nome jurídico completo da instituição de pagamento.

Só que a plataforma passou a enviar **evento de conversão para o TikTok**, tanto pelo
navegador quanto pelo servidor, quando um pagamento é confirmado. O que sai é o
identificador de clique do anúncio, sem dado pessoal direto, e só quando há
consentimento no banner. Ainda assim, é um destinatário que a lista não menciona, e é
uma plataforma de publicidade — não cabe em "provedores de infraestrutura e
comunicação".

A Política é de 25 de julho; a integração com o TikTok veio depois. Não é erro de quem
redigiu: é o documento que ficou para trás de uma mudança no produto.

**Isto é cláusula, não redação de marca — precisa do seu jurídico.** Não escrevo o
texto. O que dá para adiantar é o levantamento técnico do que exatamente é enviado,
que está em `src/lib/analytics.js`, `src/lib/atribuicao.js` e na função
`asaas-webhook`.

## Um ponto de atenção, sem erro hoje

Os Termos fixam a política de reembolso em números: 2 horas para reembolso integral e
50% de retenção abaixo disso. No sistema, esses três valores são **configuráveis** pelo
painel administrativo (`refund_full_hours`, `refund_partial_hours`,
`refund_partial_pct`).

Os Termos já se protegem, ao dizer que os parâmetros "podem ser ajustados na
Plataforma". Mas se alguém mudar o percentual no painel sem republicar o documento, o
contrato passa a dizer um número e o sistema a praticar outro. Vale conferir se os
valores no painel hoje são exatamente 2 horas e 50%.

## Por que os PDFs não foram regerados

Foi decisão, e vale explicar. Regerar os arquivos a partir do texto extraído
**pioraria** os documentos:

- A seção 6 da Política é uma **tabela** de finalidades e bases legais. Extraída, ela
  vira uma lista de linhas alternadas, e a relação entre finalidade e base legal se
  perde. Num documento de LGPD, é justamente essa relação que tem valor.
- Negrito, numeração e recuos se perdem na extração e teriam que ser remontados à mão,
  linha a linha, em 19 páginas — cada uma uma chance de alterar o que está escrito.
- O layout atual já está correto: marca aviDoc no cabeçalho, hierarquia legível, rodapé
  institucional com razão social, CNPJ e endereço em todas as páginas.

Substituir um documento bom por um pior, para dizer que foi "atualizado", seria o pior
resultado possível aqui.

## O que fazer com isto

1. Levar a lacuna da seção 8 ao jurídico, com o levantamento do que é enviado ao TikTok.
2. Conferir no painel se os valores de reembolso batem com os 2h/50% dos Termos.
3. Republicar apenas a Política de Privacidade, se o jurídico incluir a cláusula. Os
   Termos e o Termo de Adesão não precisam de nova versão pelo que foi encontrado aqui.
