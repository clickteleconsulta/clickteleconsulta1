# Arquitetura — Click Teleconsulta

## Sistema
- **Frontend:** React 18 + Vite 4 (JS), React Router 6, Tailwind + Radix/shadcn (`src/components/ui`), react-hook-form + zod, framer-motion.
- **Backend:** Supabase — Postgres + RLS + Auth + Storage + Edge Functions (Deno) em `supabase/functions/`.
- **Integrações:** JaaS/8x8 (vídeo, via Edge Function `generate-jaas-token`), Memed (receita digital), WhatsApp (lembretes por cron).
- **Deploy:** Vercel (projeto `click-teleconsulta`, auto-deploy do `main`); domínio `clickteleconsulta.online` com DNS na Hostinger apontando pro Vercel.

## Papéis / áreas
- **paciente**, **medico**, **admin** — isolados por RLS e por `ProtectedRoute`/`DoctorRouteGuard` (ver `src/App.jsx`).

## Estado do source-of-truth (importante)
- Produção pode servir um **build compilado** (recuperado) promovido manualmente no Vercel; o fonte do repo evolui em paralelo.
- Migrar produção para o fonte é uma **decisão deliberada** (merge na `main`), nunca acidental.

## Time de agentes
- Definido em `.claude/agents/`. Fluxo em [CONTRIBUTING.md](../CONTRIBUTING.md). Ownership em [OWNERSHIP.md](OWNERSHIP.md).

## Contratos
- Interfaces entre camadas ficam em `src/contracts/` (fonte única para Front↔Back). Mudança de contrato = ADR + PR próprio.
