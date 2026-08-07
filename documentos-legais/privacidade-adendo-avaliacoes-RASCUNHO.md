# Adendo à Política de Privacidade — dados de avaliação

> ⚠️ **RASCUNHO — não publicar sem revisão jurídica.**
> Referência: Política de privacidade e cookies da Doctoralia Brasil
> (v. 19/06/2025, 58 páginas) e a nossa Política de Privacidade v1.1
> (6 de agosto de 2026, 16 seções).

## Por que este adendo existe

A v1.1 cobre bem o que a plataforma faz hoje. Mas as palavras "avaliação" e
"opinião" aparecem **uma vez cada**, em outro contexto: não há finalidade
declarada, base legal nem prazo de retenção para os dados de quem avalia.

Enquanto a avaliação nascia apenas de uma consulta paga, dentro da conta do
paciente, o consentimento e o contrato do cadastro davam cobertura. Abrindo a
avaliação para quem não está logado, passa a haver tratamento de dado de pessoa
sem contrato com a plataforma — e, no campo de texto livre, ela pode descrever
sintoma, diagnóstico ou tratamento. **Isso é dado sensível de saúde**, que na
LGPD tem base legal própria (art. 11) e não se resolve pelo consentimento
genérico do cadastro.

## Como a referência resolve

Na política da Doctoralia, a linha "Dê sua opinião" da tabela de tratamento diz,
em resumo:

- **Dados:** identificação, conteúdo da opinião, motivo da consulta; e, apenas
  em caso de reivindicação do profissional, outros dados.
- **Base legal:** consentimento — e é explícito que escrever a opinião é
  voluntário.
- **Retenção:** a opinião publicada não é excluída, a menos que o titular peça
  expressamente. Ao pedir, os dados pessoais são **dissociados** e o conteúdo é
  mantido com base em legítimo interesse.

A dissociação é a peça inteligente. Sem ela, bastaria pressionar pacientes a
apagar avaliações para reescrever a reputação de um perfil. Com ela, o
comentário sobrevive sem vínculo com a pessoa — o titular recupera o anonimato e
a base de avaliações não vira instrumento de pressão.

---

## Texto proposto — inserir na seção 6 (Finalidades e bases legais)

| Finalidade | Base legal (LGPD) |
|---|---|
| Receber, moderar e publicar avaliação sobre profissional | Consentimento (art. 7º, I), revogável a qualquer tempo |
| Conteúdo de saúde eventualmente incluído pelo titular no texto da avaliação | Consentimento específico e destacado (art. 11, I) |
| Confirmar o telefone de quem avalia, por código enviado por WhatsApp ou SMS | Legítimo interesse (art. 7º, IX) — prevenção a fraude |
| Verificar a autenticidade da avaliação e prevenir avaliação falsa | Legítimo interesse (art. 7º, IX) |
| Manter o conteúdo da avaliação após pedido de exclusão, de forma dissociada | Legítimo interesse (art. 7º, IX) e art. 12 (dado anonimizado) |
| Defesa em processo judicial ou administrativo envolvendo a avaliação | Exercício regular de direitos (art. 7º, VI) |

## Texto proposto — nova subseção

### Avaliações

**Escrever uma avaliação é voluntário.** Você decide se escreve, o que escreve e
com que nome aparece.

**O que coletamos ao avaliar:** a nota, o texto, o nome ou as iniciais que você
informar, o **número de telefone** usado na confirmação e, quando o envio vem
pelo link do seu agendamento, o vínculo com aquela consulta. Registramos também
endereço IP e informações do dispositivo, usados apenas para detectar avaliação
falsa.

**O telefone.** Enviamos um código de 6 dígitos por WhatsApp ou SMS para
confirmar que existe uma pessoa real por trás da avaliação. O número **não é
publicado**, não é entregue ao profissional avaliado e não é usado para
propaganda. Guardamos apenas o registro de que aquele número confirmou aquela
avaliação, pelo tempo necessário para apurar denúncia de fraude — ver o prazo
abaixo.

**Dados de saúde no texto livre.** O campo é livre e você pode acabar
descrevendo sintomas, diagnóstico ou tratamento — informação sensível. Só
trataremos esse conteúdo com o seu consentimento específico, manifestado no
envio, e recomendamos que você não inclua o que não queira ver publicado. A
avaliação é publicada na página do profissional e fica acessível a qualquer
pessoa na internet.

**Moderação.** Toda avaliação é revisada por uma pessoa antes de ser publicada,
conforme as Diretrizes de Avaliação. Se houver indício de inautenticidade,
podemos solicitar comprovante do atendimento, com prazo de 30 dias; o que for
enviado é usado só nessa apuração e descartado ao final.

**Por quanto tempo guardamos.** A avaliação publicada permanece enquanto você
não pedir a exclusão. Ao pedir, retiramos os dados que identificam você em até
[X] dias; o texto pode ser mantido de forma dissociada, sem vínculo com a sua
pessoa, para preservar a integridade do histórico de avaliações do profissional.

**Revogar o consentimento.** Você pode retirar o consentimento a qualquer
momento pelo canal de contato do Encarregado, indicado nesta Política. A
revogação não afeta o tratamento feito antes dela.

---

### Notas para a revisão jurídica

1. **Consentimento vs. legítimo interesse** — a referência usa consentimento
   como base principal. Confirmar que é a escolha certa para quem avalia **sem
   ter conta**, onde não há contrato nenhum sustentando o tratamento.
2. **Art. 11, I** — o consentimento para dado sensível precisa ser
   "específico e destacado", com finalidades específicas. Na prática isso quer
   dizer que a caixa de aceite do formulário não pode ser a mesma dos termos
   gerais: precisa ser própria, e o texto dela precisa nascer daqui.
3. **Prazo [X] para dissociar** — definir. A referência não publica prazo; a
   LGPD fala em prazo razoável.
4. **IP e dispositivo** — hoje a v1.1 já trata disso em "Segurança, prevenção a
   fraude" (art. 7º, IX). Conferir se cobre a coleta de quem **não é usuário
   cadastrado**, que é o caso da avaliação aberta.
5. **Retenção do comprovante de atendimento** — a v1.1 não prevê essa categoria.
   Se o pedido de comprovante entrar nas Diretrizes, precisa entrar aqui também.
6. **Menor de idade** — a v1.1 tem seção 4 sobre menores e dependentes. Verificar
   se a regra das Diretrizes (só o adulto responsável avalia) conversa com ela.
7. **Telefone** — definir o prazo de retenção do número e se ele fica guardado
   em texto claro ou como impressão digital criptográfica (*hash*). O *hash*
   permite bloquear reincidente e impedir avaliação duplicada sem manter o
   número em si, e reduz o dano de um vazamento. Recomendo o *hash*, mas quem
   decide o que a apuração de fraude exige é a assessoria.
8. **Avaliação sobre atendimento fora da plataforma** — a referência declara
   isso nos Termos (cláusula 8.1) e não na política. Verificar se, do nosso
   lado, precisa aparecer nos dois.
9. **Avaliação sem vínculo com agendamento** — decisão de produto que precisa
   estar refletida no texto: hoje a v1.1 descreve uma plataforma onde todo dado
   de paciente nasce de um agendamento. Deixa de ser verdade.
