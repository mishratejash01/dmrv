<div align="center">

# 🌾 Rainbow dMRV

### Digital Monitoring, Reporting & Verification for distributed open-kiln biochar

A production-grade **dMRV platform** that tracks a distributed biochar carbon-removal
operation across its entire lifecycle — from biomass sourcing through pyrolysis, quenching,
sampling, lab testing, durable end-use, net-CO₂ accounting, third-party verification, and
**Rainbow Carbon Credit (RCC)** issuance — faithful to the
[Rainbow Standard](https://docs.rainbowstandard.io) *Distributed Open-Kiln Biochar*
methodology (`RBW-BCR-DOB-V1.0`).

</div>

---

## What this is

Under the Rainbow Standard, the **dMRV platform is the software layer** — provided by a
third party, not by Rainbow — that lets kiln operators record and document their operations
so an auditor can verify them and Rainbow can issue certified carbon credits. This project
*is* that platform.

It models the full traceability chain and enforces the methodology's real rules:

- **6-month / 200-tonne** production-batch validity (whichever comes first)
- **H/C₍org₎ < 0.7** permanence eligibility, with temperature-dependent 100-year permanence
  regressions and an optional 1000-year reflectance pathway
- Required **photographic evidence** (clean pyrolysis, flame curtain, quenching) before a
  run can complete
- The **composite-pile sampling chain** (site pile → site sample → batch pile →
  representative sample → accredited lab)
- **Strict separation of duties** between those who produce biochar and those who review it
- **2%** buffer-pool contribution (rounded up) on verified removal RCCs
- **Separate** removal vs avoidance accounting, per **ISO 14064-2:2019** comparative LCA

## Roles (real RBAC, enforced at the database with Row Level Security)

| Role | What they do |
|---|---|
| **Kiln Operator** | Logs kiln runs in the field (mobile-first, offline-capable): feedstock, temperatures, GPS, required photos, biochar mass, composite sample. |
| **Kiln Supervisor** | On-the-ground QA. Reviews operator submissions, flags anomalies, logs site visits. |
| **Project Developer** | Owns the project & all sites. Manages batches, feedstock, submits for verification, receives carbon finance. |
| **Verifier / VVB** | External auditor. Read-through of the whole evidence chain; adds findings; approves/rejects. |
| **Registry Admin** | Issues RCCs with encoded serials, manages the buffer pool, tracks the credit lifecycle. |
| **Super Admin** | Manages users, roles, and projects. |

## Domain model

```
Project → Site → Kiln → Kiln Run → Biochar Output → Composite Sample
   → Production Batch → Lab Test → GHG Quantification → Verification
   → RCC Issuance → (Buffer Pool + Registry ledger)

Feedstock Batch ─┘ feeds runs      End-Use Record ─┘ locks the carbon
Audit Trail ── immutable log of every mutation
```

Every record traces **both directions**: from a single feedstock delivery all the way to an
issued credit, and from any credit back to the field photos that produced it.

## Tech stack — and why

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Server components for secure data access, route handlers for admin actions, great mobile performance, one deploy target. |
| Backend | **Supabase** — Postgres, Auth, Storage, RLS, triggers | Row Level Security enforces the separation-of-duties requirement *at the database*, not just the UI. Storage holds field photos & lab reports. |
| Styling | **Tailwind CSS v4** with a warm design-token system | A single source of truth for the calm, earthy palette; light-mode-first. |
| Data viz | **Recharts** | Warm-tinted, dependency-light charts. |
| Maps | **react-leaflet + OpenStreetMap** | No API key; plots sites, kilns, and end-use GPS. |
| Offline | **IndexedDB** sync queue | Field operators submit runs with no signal; they sync when back online. |
| Validation | **Zod** | Methodology rules validated on the client and server. |
| Export | Client-side **PDF + CSV** | Verification packages and registry exports. |

## Setup

```bash
# 1. Install
npm install

# 2. Environment — copy the example and fill in your Supabase values
cp .env.example .env.local

# 3. Provision the database (schema, RLS, functions, triggers, storage, seed)
npm run db:setup     # applies supabase/migrations/*.sql then seeds demo data

# 4. Run
npm run dev          # http://localhost:3000
```

The app ships with a **fully seeded demo project** — the *Deccan Biochar Cooperative*
(Maharashtra, India): 3 sites, 6 flame-curtain kilns, 30 kiln runs with evidence photos,
a verified production batch (**18.6 t dry biochar → 36.36 tCO₂e net removed**), lab results
(H/C₍org₎ 0.42), a completed VVB verification, and **36 issued RCCs** (29 held, 6 retired,
1 in the buffer pool) — so it is completely explorable on first run.

## Demo accounts & guided tour

Open **`/login`** and use the **one-click demo sign-in** cards, or type an email below
(password for all: `RainbowDemo!26`). Each role sees a different slice of the platform —
Row Level Security enforces it at the database.

| Sign in as | Email | See it in action |
|---|---|---|
| **Kiln Operator** | `operator@dmrv.demo` | **Field log** — log a run (photos, GPS, mass); works offline. Only their assigned sites. |
| **Kiln Supervisor** | `supervisor@dmrv.demo` | **Review queue** — approve/reject operator submissions; site audits. |
| **Project Developer** | `developer@dmrv.demo` | Everything for the project — **Batches** (6-mo/200-t meters), **GHG calculator**, **Lab**, **End-use**, **Team**. |
| **Verifier (VVB)** | `verifier@dmrv.demo` | **Verification** — read the full evidence chain, add findings, approve; print the package. |
| **Registry Admin** | `registry@dmrv.demo` | **Registry** — issue RCCs (two-person control), the serialised ledger, retire/transfer, **Buffer pool**. |
| **Super Admin** | `admin@dmrv.demo` | Full system access. |

A good first tour as the **Developer**: Dashboard → Batches → open `PB-2026-01` (see the
sampling chain, lab result and transparent GHG breakdown) → **Registry** (the issued credits
and their serials) → **Traceability** (pick a credit and walk it all the way back to the
field photos that produced it). The **`/registry-public`** page is a no-login transparency
view of the credit ledger.

## Project structure

```
src/
  app/            Next.js routes: (auth) sign-in · (app) protected shell + all modules ·
                  onboarding · registry-public · auth/callback
  components/     Warm design-system UI (ui/*), charts, map, evidence, ghg, layout, field
  lib/            Supabase clients (browser/server/admin) · auth+RBAC context · GHG engine ·
                  RCC serials · offline IndexedDB queue · methodology constants · actions/*
supabase/
  migrations/     Versioned SQL: 0001 enums · 0002 schema · 0003 functions/triggers ·
                  0004 RLS policies · 0005 storage
scripts/          db-apply · db-types · seed (run via npm run db:*)
```

## Methodology fidelity

The rules, thresholds, permanence regressions, emission factors, AR6 GWP values, and serial
format are encoded in [`src/lib/methodology.ts`](src/lib/methodology.ts) and the transparent
GHG engine in [`src/lib/ghg.ts`](src/lib/ghg.ts), each traceable to the Rainbow Standard
documentation. Highlights: 100-year permanence via the temperature-dependent
`F = c − m·(H/C₍org₎)` regression, the `× 3.67` CO₂/C factor, the composite-pile sampling
chain, two-person credit issuance, and the 2 % buffer contribution (rounded up).

## Security & deployment

- **Row Level Security** is on for every table; the app enforces separation of duties at the
  database, not just the UI (validated: an operator cannot log to an unassigned site, cannot
  approve runs; a verifier cannot mutate source evidence; only the registry can issue).
- Secrets live only in `.env.local` (git-ignored). `.env.example` documents the variables.
- Deploys cleanly to **Vercel**: import the repo, set the four env vars, and deploy — the
  Supabase backend is already provisioned.

> **Rotate the Supabase access token.** The provisioning token in `.env.local` is highly
> privileged. After setup, rotate it in the Supabase dashboard (Account → Access Tokens);
> the running app only needs `NEXT_PUBLIC_SUPABASE_*` and `SUPABASE_SERVICE_ROLE_KEY`.

---

*Built as a faithful reference implementation of the Rainbow Standard dMRV layer for
distributed open-kiln biochar.*
