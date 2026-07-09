# Fluxo de trabalho — Time de agentes (Click Teleconsulta)

Toda mudança relevante passa por um pipeline de agentes especializados (definidos em `.claude/agents/`). O **Tech Lead/Orquestrador** (a sessão principal do Claude Code, junto com você) delega, resolve conflitos e é o **único que faz merge na `main`**.

## Pipeline

```
Pedido → Tech Lead
  1. product-manager       (requisitos + critérios de aceite)
  2. software-architect    (decisão técnica + CONTRATOS + ADR)   ← congela a interface
  ├─ 3. database-architect (migrations + RLS + testes RLS)   ┐ paralelo
  └─ 4. ux-ui-designer     (fluxos + estados + acessibilidade)┘
  ║ 5. backend-engineer  ║ 6. frontend-engineer   (paralelo, cada um na sua camada)
  7. security-engineer     (auditoria — VETO em risco crítico)
  8. qa-test-engineer      (testes E2E/unidade — VETO em teste vermelho)
  9. code-reviewer         (revisão adversarial)
 10. devops-deploy         (CI → preview → produção)
 11. documentation-agent   (changelog/ADR/README)
```

Regra de ouro: **nada de código antes do contrato (passo 2) estar fechado.**

## Como evitar conflito
- Ownership de arquivos: ver [docs/OWNERSHIP.md](docs/OWNERSHIP.md). Um escritor por arquivo.
- Trabalho paralelo em **git worktrees** separados.
- Só o Tech Lead mescla na `main`.

## Gates de qualidade
- **security-engineer** e **qa-test-engineer** têm poder de **veto**.
- PR só mescla com CI verde (lint + testes + build) — ver `.github/workflows/ci.yml`.

## ⚠️ Deploy / produção (crítico neste projeto)
- Produção pode estar servindo um **build compilado promovido manualmente** no Vercel.
- **Push na `main` dispara rebuild do fonte e sobrescreve produção.** Nunca faça merge na `main` sem confirmação explícita do usuário.
- Trabalho normal vive em branch → preview no Vercel.

## Decisões técnicas
Registradas como ADRs em `docs/adr/`, indexadas em [docs/DECISIONS.md](docs/DECISIONS.md).
