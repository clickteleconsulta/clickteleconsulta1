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

## O caminho legítimo para as primeiras avaliações

Este é o achado mais útil de todo o estudo, e está na cláusula 8.1 dos Termos e
Condições da Doctoralia:

> "Em alguns casos, as opiniões refletem uma consulta com um Profissional que foi
> concluída por meio do nosso Site. **Em outros casos, no entanto, as opiniões são
> deixadas por Usuários que fizeram um agendamento ou realizaram uma consulta com
> um Profissional fora da plataforma da Doctoralia.**"

Ou seja: a avaliação é sobre **o profissional**, não sobre o canal por onde a
consulta foi marcada. Quem se consultou no consultório, por outra plataforma ou
por encaminhamento pode avaliar aquele médico ali.

Isso muda tudo para o problema de partida. A aviDoc não tem avaliação porque
ainda não teve consulta — mas **os profissionais têm pacientes**: centenas pela
MedPrev, dezenas pela Doctoralia. São pessoas reais, que foram realmente
atendidas por eles, e que podem legitimamente escrever sobre a experiência que
tiveram.

Não é o mesmo que pedir avaliação a amigo ou parente, que continua vedado nas
diretrizes e é o que gera risco. É pedir a quem foi paciente de verdade — e o
que torna isso defensável é a declaração no envio somada à confirmação do
telefone, não uma regra interna que ninguém vê.

Duas condições para que funcione sem virar problema:

1. **Declarar nos Termos**, como eles fazem, que a avaliação pode se referir a
   atendimento realizado fora da plataforma. Sem essa cláusula, a mesma prática
   fica sem respaldo.
2. **Não chamar de verificado** o que não foi. Ver a seção seguinte.

## A decisão de produto que os documentos assumem

Avaliação aberta, sem login, com **confirmação do telefone por código no
WhatsApp ou SMS**, declaração vinculante no envio e moderação antes de publicar
— o modelo da Doctoralia, cujo passo 4 é exatamente essa confirmação.

A confirmação por telefone é a peça que faltava no meu primeiro estudo, e é ela
que sustenta o modelo: fabricar avaliação em série passa a exigir uma linha
telefônica por avaliação. Não impede fraude determinada; encarece o suficiente
para não valer a pena.

**Do nosso lado isso é barato de construir:** o Supabase Auth, que já
autentica a plataforma, tem verificação por telefone com código nativa. Não
precisa de serviço novo nem de tabela de token.

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
