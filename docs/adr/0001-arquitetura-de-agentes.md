# ADR-0001 — Arquitetura de trabalho com múltiplos agentes

**Status:** Aceito · **Data:** 2026-07-09

## Contexto
O Click Teleconsulta é um app de telemedicina (dados sensíveis, LGPD) com stack React/Vite + Supabase, sem testes nem CI até então. O usuário quer um processo de desenvolvimento estruturado, seguro e revisável, com agentes especializados.

## Decisão
Adotar um pipeline de 11 agentes especializados (`.claude/agents/`) orquestrado pela sessão principal (Tech Lead): product-manager → software-architect → (database-architect ‖ ux-ui-designer) → (backend-engineer ‖ frontend-engineer) → security-engineer → qa-test-engineer → code-reviewer → devops-deploy → documentation-agent.

Princípios:
- **Contrato primeiro:** o arquiteto congela a interface antes de qualquer código.
- **Ownership de arquivos** + worktrees para evitar conflito; só o Tech Lead mescla na `main`.
- **Gates com veto:** security e QA podem bloquear.
- **Decisões viram ADRs.**
- **Produção protegida:** merge na `main` nunca sem confirmação (dispara rebuild que sobrescreve o build compilado promovido).

## Alternativas descartadas
- **Um único agente generalista:** menos revisão cruzada, mais risco em domínio sensível.
- **Sem contratos formais:** leva a divergência Front/Back e retrabalho.

## Consequências
- (+) Revisão adversarial, rastreabilidade, segurança/LGPD tratadas por gate dedicado.
- (+) Paralelismo real (front/back/db) com baixo conflito.
- (−) Mais overhead por feature; exige disciplina de ownership e de contratos.
- Requer infra da Fase 1 (CI, Vitest/Playwright) para os gates funcionarem de fato.
