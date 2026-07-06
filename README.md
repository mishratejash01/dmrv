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

The app ships with a **fully seeded demo project** — a sample project, multiple sites and
kilns, dozens of kiln runs with photos, a closed batch with lab results, a completed
verification, and issued credits — so it is completely explorable on first run. Demo
sign-in credentials are printed at the end of `npm run db:setup`.

## Project structure

```
src/
  app/            Next.js routes (auth, dashboards, field, batches, lab, verification, registry…)
  components/     Warm design-system UI, charts, maps, layout
  lib/            Supabase clients, GHG engine, RCC serials, offline queue, methodology constants
supabase/
  migrations/     Versioned SQL: schema, functions/triggers, RLS policies, storage
  seed/           Realistic demo data
```

## Methodology fidelity

The rules, thresholds, permanence regressions, emission factors, GWP values, and serial
format are encoded in [`src/lib/methodology.ts`](src/lib/methodology.ts) and the GHG engine
in [`src/lib/ghg.ts`](src/lib/ghg.ts), each traceable to the Rainbow Standard documentation.

---

*Built as a faithful reference implementation of the Rainbow Standard dMRV layer for
distributed open-kiln biochar.*
