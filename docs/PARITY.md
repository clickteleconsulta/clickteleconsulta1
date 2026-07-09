# Mapa de Paridade — Reconstrução do fonte da fase avançada

> **Objetivo:** trazer o código-fonte do repositório (`main`, versão antiga) para **paridade** com o
> build avançado que estava/está no ar, usando o app rodando como referência visual/funcional.
> Não decompilar — reconstruir por paridade sobre a mesma stack.

## Referências (fonte da verdade da fase avançada)
- **Build compilado preservado:** branch `recovered-build`, pasta `reference/recovered-build/` (snapshot da Hostinger, `last-modified 28/abr`).
- **App rodando:** `https://clickteleconsulta.online` (produção serve HOJE o build recuperado, via deploy CLI).
- **Supabase:** mesmo projeto atual (`fnzvopspcoefzybtmwlg`) — dados reais.

## Regras de trabalho (não perder o site)
- 🔒 **`main` congelada.** Qualquer push na `main` faz o Vercel rebuildar o fonte antigo e **sobrescrever** a produção. Só mesclar na `main` ao atingir **100% de paridade**.
- 🌿 Toda reconstrução ocorre na branch **`rebuild/parity`** (gera apenas *preview*).
- ✅ Validação de cada item é feita pelo usuário no browser (preview) antes de marcar como concluído.

## Legenda de status
`⬜ pendente` · `🔧 em reconstrução` · `🔍 comparar no browser` · `✅ paridade confirmada` · `🆕 tela nova`

---

## 1. Diferenças globais / arquitetura
| Item | Build avançado | Repo (antigo) | Ação | Status |
|---|---|---|---|---|
| Bundling | Code-splitting por rota + `vendor-react/supabase/pdf/ui/utils` | `index` monolítico (~2,5 MB) | Configurar `manualChunks` + lazy routes no `vite.config.js`/`App.jsx` | ⬜ |
| CSS | `index-a0a9e4ec.css` (~158 KB) | ~138 KB | Reconstruir estilos/tema até bater | 🔍 |
| Logo header | (verificar) | imagem quebrada | Corrigir caminho do asset do logo | ⬜ |

## 2. Telas/rotas NOVAS (não existem no fonte) — reconstruir do zero
| Rota | Componente | Descrição provável | Status |
|---|---|---|---|
| `/admin/dashboard/financeiro` | `AdminFinancePage` | Financeiro do admin | 🆕 ⬜ |
| `/admin/dashboard/relatorios` | `AdminReportsPage` | Relatórios do admin | 🆕 ⬜ |
| `/medico/dashboard/financeiro` | (Doctor finance) | Financeiro do médico | 🆕 ⬜ |
| `/medico/dashboard/relatorios` | (Doctor reports) | Relatórios do médico | 🆕 ⬜ |
| `/pagamento` | `PaymentPage` | Fluxo de pagamento dedicado | 🔍 ⬜ |
| (signup por convite) | `DoctorInviteSignUpPage` | Cadastro de médico via convite | 🆕 ⬜ |

## 3. Telas EXISTENTES — verificar paridade de design/conteúdo
> Para cada uma: abrir a rota no app avançado (referência) e comparar com o fonte; portar diferenças.

| Rota | Página | Diferenças conhecidas | Status |
|---|---|---|---|
| `/` | HomePage | **Hero escuro (navy)** vs claro; stats **"15.000+"** e **nº de médicos dinâmico** vs "5.000+/50+" fixos; conferir seções (como funciona, benefícios, depoimentos) | 🔍 ⬜ |
| `/medicos` | DoctorsListPage | comparar cards/filtretos | 🔍 ⬜ |
| `/agendamentos` | AppointmentsPage | comparar layout de busca + grade de horários | 🔍 ⬜ |
| `/medico/:id` | DoctorPublicProfilePage | comparar perfil público | 🔍 ⬜ |
| `/suporte` | SupportPage | — | 🔍 ⬜ |
| `/acesso-paciente` `/acesso-medico` | AuthPage | comparar formulários/login | 🔍 ⬜ |
| `/checkout` `/pagamento` | CheckoutPage/PaymentPage | comparar fluxo de pagamento | 🔍 ⬜ |
| `/agendamento/revisao` `/agendamento/confirmado` `/agendamento-sucesso` | fluxo de agendamento | comparar etapas | 🔍 ⬜ |
| `/paciente/dashboard/*` | PatientArea | consultas, prontuário, avaliações, mensagens | 🔍 ⬜ |
| `/medico/dashboard/*` | DoctorArea | consultas, agenda, procedimentos, perfil, financeiro, integrações | 🔍 ⬜ |
| `/admin/dashboard/*` | AdminLayout + páginas | agendamentos, profissionais, avaliações, métodos, saques, ai-training, legal, **financeiro**, **relatórios** | 🔍 ⬜ |
| `/consulta/:id` `/call/:id` | VideoCallPage | comparar sala de teleconsulta | 🔍 ⬜ |
| `/mensagens` | MessagesPage | comparar chat | 🔍 ⬜ |
| `/legal` `/guia/:id` `/verificar/:code` `/paciente/guest` | páginas avulsas | — | 🔍 ⬜ |

## 4. Como fechar cada item
1. Abrir a rota no app avançado (referência) e no preview do fonte reconstruído.
2. Portar as diferenças de design/conteúdo/comportamento no fonte (branch `rebuild/parity`).
3. Usuário valida no browser → marcar `✅`.
4. Ao concluir todas → merge `rebuild/parity` → `main` → produção passa a ser o fonte reconstruído.

## 5. Ordem sugerida (por visibilidade/valor)
1. HomePage (hero + stats) e Header/logo
2. Fluxo de agendamento/pagamento (core do negócio)
3. Áreas logadas: paciente e médico
4. Admin (incl. telas novas: financeiro/relatórios)
5. Telemedicina, mensagens, páginas avulsas
6. Arquitetura de build (code-splitting) por último
