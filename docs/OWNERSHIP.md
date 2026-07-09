# Ownership de arquivos (evita conflito entre agentes)

Cada agente escreve **somente** na sua camada. O orquestrador (Tech Lead) é o único que faz merge na `main`.

| Camada | Pastas/arquivos | Dono |
|---|---|---|
| Requisitos | `docs/specs/` | product-manager |
| Arquitetura / contratos | `docs/adr/`, `src/contracts/` | software-architect |
| Banco de dados | `supabase/migrations/`, `supabase/schema.sql` | database-architect |
| Design | `docs/design/` | ux-ui-designer |
| Backend | `supabase/functions/`, `src/api/` | backend-engineer |
| Frontend | `src/components/`, `src/pages/`, hooks de UI | frontend-engineer |
| Testes | `tests/` | qa-test-engineer |
| CI/Deploy | `.github/`, `vercel.json` | devops-deploy |
| Documentação | `CHANGELOG.md`, `README.md`, `docs/*.md` | documentation-agent |

## Regras
- Dois agentes nunca editam o mesmo arquivo ao mesmo tempo.
- Trabalho paralelo (backend + frontend) usa **git worktrees** separados.
- Mudança de contrato (`src/contracts/`) é PR próprio, revisado antes da implementação.
- `security-engineer` e `code-reviewer` são **read-only** (apontam, não editam).
