# Documentos legais — origem e fluxo

## Como funciona hoje

Os documentos vivos ficam na tabela `platform_legal_documents`, e o que o site
publica é o **PDF** apontado por `pdf_url` — não um texto em Markdown. Hoje há
dois, ambos ativos:

| Tipo | Versão | Arquivo |
|---|---|---|
| `terms_of_service` | 11 | Termos de Serviço |
| `privacy_policy` | 9 | Política de Privacidade — v1.1, 6 de agosto de 2026 |

**O texto-fonte desses PDFs não existia em lugar nenhum.** Eles só existem como
binário no storage. Quem precisasse de uma v1.2 teria que redigitar a partir do
PDF, com o risco de erro que isso traz. Esta pasta começa a corrigir isso: o que
for redigido daqui para frente nasce aqui, em texto, versionado junto com o
código, e só depois vira PDF.

## O que tem aqui

| Arquivo | O que é |
|---|---|
| `avaliacoes-diretrizes-RASCUNHO.md` | Diretrizes de avaliação da aviDoc |
| `privacidade-adendo-avaliacoes-RASCUNHO.md` | O que falta na Política de Privacidade para cobrir avaliações |

## ⚠️ São RASCUNHOS. Não publique sem advogado.

O nome não é formalidade. Vale a regra que já governa este projeto: **texto
legal não se inventa**. O que está nestes arquivos foi redigido a partir de duas
fontes concretas — as diretrizes públicas da Doctoralia e a nossa própria
Política de Privacidade v1.1 — e mapeado para os artigos da LGPD que se
aplicam. Isso é matéria-prima para o advogado, não parecer jurídico.

Antes de virar PDF, precisa passar por quem responde por isso.

## O gargalo que motivou os dois arquivos

A Política de Privacidade v1.1 tem 16 seções e cobre bem o que a plataforma faz
hoje: dados coletados, bases legais, dados sensíveis de saúde, menores,
retenção, direitos do titular, DPO, CFM 2.336/2023.

**O que ela não cobre é avaliação.** As palavras "avaliação" e "opinião"
aparecem uma vez cada, em outro contexto. Não há finalidade declarada, base
legal, nem prazo de retenção para os dados de quem escreve uma avaliação.

Enquanto a avaliação só existia amarrada a uma consulta paga, dentro da conta do
paciente, isso passava. Abrir a avaliação para quem não está logado muda o
quadro: passa a haver tratamento de dado de pessoa que não tem contrato com a
plataforma, com texto livre onde ela pode descrever sintoma, diagnóstico e
tratamento — ou seja, **dado sensível de saúde, que na LGPD tem base legal
própria** (art. 11) e não se resolve com o consentimento genérico do cadastro.

## A decisão de produto que os documentos assumem

Avaliação aberta, sem login, com declaração vinculante no envio e moderação
antes de publicar — o modelo da Doctoralia. Ver o rascunho de diretrizes para o
detalhe.

**Uma consequência a resolver antes de ligar:** o perfil público hoje mostra
"Paciente Verificado" ao lado de toda avaliação
(`src/pages/DoctorPublicProfilePage.jsx`). Esse rótulo é verdadeiro porque, hoje,
avaliação só nasce de agendamento com status `atendido` ou `realizado`. Com
avaliação aberta ele deixa de ser verdade — e um rótulo de verificação que não
verifica nada é pior que rótulo nenhum.

O caminho é manter os dois: quem avalia pelo link do próprio agendamento
continua "Paciente verificado"; quem avalia pelo formulário aberto aparece sem o
selo. A diferença é visível, honesta e ainda favorece o fluxo que dá mais
confiança.
