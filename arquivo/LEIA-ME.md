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
