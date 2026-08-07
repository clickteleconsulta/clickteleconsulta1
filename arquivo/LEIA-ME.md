# Código arquivado

Funcionalidades que existem, funcionam, e estão **desligadas** — tiradas do
`src/` para não pesar no build nem aparecer como produto em auditoria, mas
guardadas inteiras para voltarem quando fizerem sentido.

## O que está aqui

`prontuario-e-videochamada.tar.gz` — 20 arquivos, 261 KB de fonte.

| Bloco | Arquivos | O que era |
|---|---|---|
| **Prontuário** | `pages/prontuario/`, `components/prontuario/`, `pages/pacientes/PacientesListPage.jsx`, `components/doctor/DoctorDocuments.jsx` | prontuário eletrônico, episódios clínicos, lista de pacientes do médico e a tela de documentos emitidos |
| **Receita (Memed)** | `integrations/memed/`, `pages/MemedPrescricaoPage.jsx` | prescrição digital pela Memed |
| **Guia e verificação** | `pages/GuideViewerPage.jsx`, `pages/VerificationPage.jsx` | guia de atendimento e conferência de documento por código |
| **Videochamada** | `pages/VideoCallPage.jsx`, `pages/ConsultaEncerradaPage.jsx`, `components/telemedicine/`, `hooks/useTelemedicineRoom.js`, `utils/telemedicineUtils.js` | sala de vídeo (Jitsi/JaaS), consentimento TCLE, botões de entrar na consulta e a tela de pós-consulta |

Removidos do `src/` em 6 de agosto de 2026, com as flags `PRONTUARIO` e
`VIDEO_CALL` em `false` desde antes disso.

## Assistente de IA (balão do canto)

Removido em 6 de agosto de 2026, a pedido. Eram dois arquivos:
`components/AssistenteFlutuante.jsx` (o botão) e `components/AiChatWidget.jsx`
(a conversa). Não estão neste pacote porque o histórico do Git já os guarda
inteiros:

```bash
git show <commit>:src/components/AiChatWidget.jsx > src/components/AiChatWidget.jsx
```

O commit que os removeu é o mesmo que trocou as barras de navegação do celular
por trilhos laterais. Para religar, basta importar `AssistenteFlutuante` no
`AppLayout` de `src/App.jsx` e montá-lo depois do rodapé.

**O que ficou órfão:** a tela `/admin/ai-training` e a tabela da base de
conhecimento continuam existindo, com o conteúdo intacto. Ela já não tinha link
no menu do admin antes disso — só se chega por URL —, e agora treina um
assistente que ninguém vê. Os dados estão preservados justamente para o caso de
o balão voltar.

## Como voltar

```bash
tar -xzf arquivo/prontuario-e-videochamada.tar.gz
```

Os caminhos dentro do pacote são relativos à raiz do projeto, então os arquivos
voltam exatamente para onde estavam. Depois disso falta religar o que **não**
está no pacote:

1. **As rotas.** Saíram de `src/App.jsx` e de `src/pages/DoctorArea.jsx`, todas
   dentro de blocos `{FEATURES.PRONTUARIO && ...}` ou `{FEATURES.VIDEO_CALL && ...}`.
2. **Os pontos de entrada nas telas vivas** — o botão de entrar na consulta em
   `PatientConsultations.jsx`, `DoctorConsultations.jsx`, `PatientArea.jsx` e
   `AppointmentConfirmationPage.jsx`.
3. **As flags** em `src/config/features.js`, que continuam lá.

O commit que removeu tudo tem o diff completo dessas religações — é a
referência mais confiável, porque mostra exatamente as linhas que saíram de cada
arquivo vivo.

## O que NÃO foi removido, e por quê

`src/utils/jitsiRoomId.js` continua no `src/`. Ele é usado por
`AppointmentsContext` na **criação do agendamento**, que é o caminho mais
crítico do produto: todo agendamento novo gera um identificador de sala, mesmo
com a videochamada desligada. Tirar isso exigiria mexer no fluxo de compra para
economizar um arquivo de 1 KB. Não compensa.

As funções de banco e as edge functions dessas telas também continuam onde
estão. Elas não pesam no navegador e removê-las quebraria dados já gravados.

## Antes de religar

As três flags foram desligadas por decisão de produto, não por defeito. Antes de
voltar, vale conferir:

- **Memed** — contrato e credenciais ainda válidos.
- **Jitsi/JaaS** — a chave e o emissor de token. Havia um `useJaaSRoom.js`
  importando uma função que não existia mais; ele foi apagado por estar morto.
- **Prontuário** — guarda dado clínico. Religar exige revisar a Política de
  Privacidade e a base legal, porque muda a natureza do que a plataforma trata.
  Hoje a aviDoc não tem acesso a conteúdo clínico, e isso está escrito nos
  documentos legais e no site.
