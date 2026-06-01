# Plan: TrendMarga — Phase 1

> **Design Principle: Mobile-First, Always.**
> Every screen — storefront, CMS, dashboard — is designed and built mobile-first (base CSS = mobile).
> Desktop is an enhancement via `sm:` / `md:` / `lg:` Tailwind breakpoints.
> Mockups in `mockups/` serve as desktop-width reference only — actual implementation starts at 375px.

## Overview

Single-tenant B2C e-commerce platform. Next.js 15 App Router + NestJS on Fastify. Turborepo monorepo. PostgreSQL + Drizzle ORM. Clerk auth (admin only). Guest checkout for customers. Deployed fully on Railway.

4 modules in scope: Storefront (public), Dashboard, CMS (unified back-office), Delivery.

---

## Monorepo Structure (Turborepo)

- `apps/web` — Next.js 16 App Router (storefront + dashboard + CMS + courier PWA)
- `apps/api` — NestJS on Fastify — monolith covering products, orders, customers, cms, delivery, storefront, analytics, payments, whatsapp, courier-portal, health
- `apps/tracking` — NestJS on Fastify (Phase 2 — courier tracking service, isolated)
- `packages/db` — Drizzle ORM + PostgreSQL schema
- `packages/types` — shared TypeScript types
- `packages/ui` — ShadCN/UI base components
- `packages/config` — Zod env validation

---

## Database Schema (PostgreSQL + Drizzle)

- `users` — admin/staff (Clerk-synced), role: OWNER | STAFF
- `categories` — id, name, slug, parent_id, image_url
- `products` — id, name, slug, description, price, compare_price, sku, inventory, category_id, images[], status (ACTIVE|DRAFT|ARCHIVED)
- `customers` — id, name, email, phone, address_json, created_at
- `orders` — id, customer_id, status (PENDING|CONFIRMED|PROCESSING|OUT_FOR_DELIVERY|DELIVERED|CANCELLED), subtotal, delivery_fee, total, notes, payment_method (CASH_ON_DELIVERY default)
- `order_items` — order_id, product_id, quantity, unit_price
- `cms_sections` — id, page (HOME), type (HERO|BANNER|FEATURED|TESTIMONIALS|ANNOUNCEMENT), data jsonb, order, is_active
- `delivery_zones` — id, name, base_fee, fee_strategy (FLAT|DISTANCE_BASED|FREE_THRESHOLD|COMBINED), fee_per_km, free_threshold, is_active
- `delivery_settings` — global defaults (default_strategy, estimated_days_min, estimated_days_max)

---

## NestJS Modules

1. AuthModule — Clerk JWT guard, webhook user sync
2. ProductsModule — CRUD, categories, inventory
3. OrdersModule — CRUD, status transitions, fulfilment workflow
4. CustomersModule — CRUD, order history
5. AnalyticsModule — dashboard stats, revenue time series, top products
6. CmsModule — all site sections CRUD
7. StorefrontModule — public REST endpoints (browse products, place order) — REST not tRPC so React Native can consume in Phase 3
8. DeliveryModule — zones config, fee calculation (flat, distance via Google Maps, free threshold, combined)

---

## Next.js App Structure

```
app/
├── (storefront)/            # Public — no auth
│   ├── page.tsx             # CMS-driven homepage
│   ├── products/            # Product listing + detail
│   ├── cart/                # Cart (localStorage)
│   ├── checkout/            # Guest checkout form
│   └── orders/[id]/         # Order confirmation + status tracker
└── (dashboard)/             # Clerk-gated (admin/staff)
    ├── dashboard/            # Sales overview + Tremor charts
    ├── cms/products/         # Product management
    ├── cms/categories/       # Category management
    ├── cms/orders/           # Order management + status updates
    ├── cms/customers/        # Customer profiles + order history
    ├── cms/content/          # Site content (hero, banners, sections)
    └── cms/delivery/         # Delivery zones + settings
```

---

## Auth

- Clerk for admin/staff only (OWNER, STAFF roles)
- Customers = guest checkout, no auth in Phase 1
- Public storefront = unauthenticated
- Dashboard/CMS = Clerk-gated

---

## CMS — Unified Back-Office

One interface manages everything: products, categories, orders, customers, site content, delivery config. No separate "Admin Panel" — CMS IS the admin.

---

## Delivery Module

- Configurable per zone: FLAT fee | DISTANCE-BASED (Google Maps Distance Matrix API) | FREE_THRESHOLD | COMBINED
- Order fulfilment workflow: PENDING → CONFIRMED → PROCESSING → OUT_FOR_DELIVERY → DELIVERED
- Customer tracking page at /orders/[id] — live status progress tracker (manual staff updates, Phase 1)
- Phase 2: courier API integration (DHL, local carriers), automated tracking numbers

---

## Design

- **Brand system (May 2026)**: `trendMarga` wordmark — lowercase camelCase, custom flat-bottom `t` SVG + bold `M` pivot + emerald pulse. Cobalt `#1E40AF` (`trendM`) + Ash `#9CA3AF` (`arga`) + Emerald `#10B981` (pulse) on Ink `#0A0A0B`. Display font: Clash Display via Fontshare. Implemented as `apps/web/components/brand/Logo.tsx` (`<Logo />`, `<LogoMark />`) with full favicon set in `apps/web/public/`.
- Tailwind CSS + ShadCN/UI
- Tremor charts for dashboard analytics
- Mobile-first, fully responsive storefront (PWA-ready)
- Phase 3: React Native mobile storefront app — REST API designed to support this from day 1

---

## Deployment — Railway (all environments)

### Branch → Environment mapping

| Branch    | Railway Environment | Purpose                                           |
| --------- | ------------------- | ------------------------------------------------- |
| `dev`     | Development         | Active dev playground — break things here         |
| `staging` | Staging             | Online pre-release testing, QA against real infra |
| `main`    | Production          | Live, stable, full flex prod                      |

### Git workflow

```
feature/* → dev (merge via PR or direct push)
dev → staging (PR, manual merge when ready to test online)
staging → main (PR, reviewed + approved before prod deploy)
```

### Railway Services per environment (x3 environments)

**Phase 1 (current):**
- `web` — Next.js (apps/web)
- `api` — NestJS monolith (apps/api) — products, orders, customers, cms, delivery, storefront, analytics, payments, whatsapp, courier-portal
- `db` — PostgreSQL
- `redis` — Redis (cache, Phase 2 BullMQ)

**Phase 2 additions (separate Railway services):**
- `tracking` — NestJS service (apps/tracking) — courier API integration, webhook receiver, tracking event log, push to frontend via SSE

> **Payments** ship inside `apps/api` (module `src/payments/`) rather than a separate service — Paystack live on staging June 2026. Cash-on-delivery remains the fallback when the breaker is OPEN or the `payments` feature flag is off.

Each Phase 2 service gets its own Railway service entry, its own env vars, its own deploy pipeline, and fails independently. If `tracking` is down, order status still shows last known state from DB.

---

## Service Resilience

### Phase 1 — Modular monolith (intentional)
- `apps/web` and `apps/api` are separate processes on separate Railway services
- If `api` is down: Next.js continues serving static/cached pages; storefront shows graceful empty states
- If `db` is down: API returns 503; web shows fallback UI
- All API responses use consistent `ApiResponse<T>` envelope — frontend never hard-crashes on failed requests

### Phase 2 — Service isolation for tracking
- **Tracking service** (`apps/tracking`) runs independently. If it's down:
  - Order status page shows last persisted status from DB (no live updates, not a blank page)
  - SSE connection times out gracefully — UI falls back to polling DB directly via `apps/api`
  - Courier webhooks are queued in Redis and replayed on recovery

### Patterns used across all services
- Health check endpoint on every service (`GET /health` → `{ status: "ok" }`)
- Graceful shutdown (NestJS `enableShutdownHooks()`)
- All inter-service calls are HTTP (not direct DB sharing between services)
- Frontend uses try/catch + fallback UI on every API call — no unhandled promise rejections

### Domains

- `trendmarga.com` → Production (main) — domain not yet registered, purchase before S7 launch
- `trendmarga-staging.up.railway.app` → Staging (Railway auto-generated)
- `trendmarga-dev.up.railway.app` → Dev (Railway auto-generated)

---

## Sprints

### Phase 1A — Foundation (S1–S2)

- S1: Monorepo setup, DB schema, Clerk auth, NestJS bootstrap, Railway project setup (all 3 environments)
- S2: Products + Categories (backend + CMS UI)

### Phase 1B — Commerce Core (S3–S4)

- S3: Orders + Customers + Delivery zones (backend + CMS UI)
- S4: Dashboard analytics (Tremor charts, revenue, order stats, top products)

### Phase 1C — Storefront + Content (S5–S6)

- S5: CMS content module (homepage sections management)
- S6: Customer storefront (product listing, detail, cart, checkout, order tracking page)

### Phase 1D — Polish + Launch (S7)

- S7: Delivery fee calculator (all strategies), PWA manifest, responsive QA, prod Railway deploy

### Phase 1E — Analytics UI Polish (S8, May 2026) ✅

> Replaces the original Tremor charts plan — shipped with **Recharts** instead.
> Design system: **Data-Dense Dashboard** (tracking blue `#2563EB` + delivery orange `#F97316` + page `#EFF6FF`).

- **A · Palette + density** (`51e6958`) — `#EFF6FF` page wrappers on `/cms/analytics` + `/dashboard`, orange CTA accents, Lucide icons replace emojis in data UI (Package, PartyPopper), reusable `PeriodSelector` pill (24h/7d/30d/90d/all — only 30d functional), `font-mono tabular-nums` on every KPI number, `p-5 → p-4` card density
- **B · Charts + interaction** (`794a8e9`) — RevenueChart now `ComposedChart` with gradient `Area` fill + optional `Brush` zoom (enabled on analytics, `showBrush` prop); styled tooltip with soft shadow + mono numerics; analytics top-products rows get per-row gradient progress bar (#1 orange, rest blue) and hover highlight
- **C · Large-screen scaling** (`a18338b`) — `max-w-450` (1800px) container, `2xl:` gap + typography bumps, low-stock `2xl:grid-cols-6`, CSS-keyframe stagger fade-up entrance (`60ms` per card) on analytics KpiCards
- **Fix** (`1f9df91`) — removed `-m-*` bg-bleed trick that was pushing the page bg outside `<main>` into the sidebar; use `flex-1 + min-h-screen` instead

---

## Decisions

- Single-tenant (no multi-tenancy in Phase 1)
- Railway for all environments — no Vercel
- Branch strategy: dev (play) → staging (test online) → main (prod)
- Payments — live on staging June 2026 (Paystack, card+MoMo+bank). COD stays as fallback. Module lives inside `apps/api/src/payments/` (NOT a separate service). Full runbook: `apps/api/src/payments/README.md`.
- POS — built in Phase 1 (`apps/api/src/pos/` + `/pos` web route, shared `orders` table with `source: ONLINE | POS`)
- Reviews, Discounts — backend built (feature-flagged off until storefront widgets ship)
- Courier tracking API = Phase 2
- Customer accounts = Phase 2
- React Native mobile app = Phase 3 (after Phase 2 closes)
- Storefront API = REST (not tRPC) to support React Native later
- tRPC = dashboard/CMS internal use only
- Delivery fees: all strategies configurable (flat, distance, free threshold, combined)
- Distance delivery = Google Maps Distance Matrix API

---

## Phase 2 (Deferred)

- **Tracking service** (`apps/tracking`) — separate Railway service
  - Courier API integration (DHL, local carriers)
  - Webhook receiver, tracking event log
  - SSE push to storefront order status page
  - If down: last-known status shown from DB, no crash
- Customer accounts / login (buyer-side; staff already on Clerk)

## Phase 3 (After Phase 2)

- React Native mobile storefront app — REST API designed to support this from day 1

---

## Ops gaps (tracked)

### Tier 2 — Service Quality self-heal (deferred)

The `/cms/service-quality` dashboard currently supports **Tier 1 diagnostics**:
one-click "Run Diagnostics" returns severity-ranked findings with suggested
fixes and copy-to-clipboard commands. **No automatic remediation** is performed.

Planned follow-up — a strictly allow-listed set of safe, idempotent
self-heal actions invokable from a finding:

- `clear-cache` — flush in-memory / Redis caches
- `restart-bullmq-worker` — bounce a worker when its queue stalls
- `reseed-category-routing` — idempotent upserts of intake routing
- `warm-product-cache` — re-hydrate the storefront catalog cache

**Explicitly excluded** (always manual, must stay copyable commands):

- Running database migrations
- Restarting API / web (already gated to OWNER)
- Mutating production data
- Changing env vars / secrets

Each remediation action must be:
- OWNER-only
- Audit-logged
- Behind a confirm dialog (require a deliberate second click)

### Tier 3 — Scheduled diagnostics + alerting (deferred)

- Cron the diagnostics every N minutes
- Persist last N runs to Postgres
- Alert (email/Slack) on first occurrence of a new critical finding

---

## Open gaps (tracked checklist — June 2026)

> Order matters: prod cutover is the **last** step — only after every gap below is closed, tested on staging, and signed off.

### Payments (built, follow-ups)
- [x] Refund flow — Paystack `/refund` API, admin button, `REFUNDED` status transition
- [ ] Dispute / chargeback webhook events (`charge.dispute.create` etc.)
- [ ] Multi-currency support (currently `GHS` hard-assumption — Paystack already covers card / MoMo / bank for GHS, NGN, ZAR, KES; no Stripe needed)

### Storefront feature-flag UIs (backends exist, UIs missing)
- [ ] Reviews — product-page widget + submit flow + moderation queue
- [ ] Inventory — out-of-stock badge on PDP / cart, low-stock warning
- [ ] Search — `/v1/search` endpoint + header search box + results page
- [ ] PWA — install prompt + push notifications (manifest already shipped)

### Customer-facing
- [ ] Customer accounts (buyer login — likely Clerk org-less or magic link)
- [ ] "My orders" list page (currently only direct-link `/orders/[id]`)
- [ ] Saved addresses

### Analytics polish
- [ ] Wire `PeriodSelector` 24h / 7d / 90d / all (only 30d functional)
- [ ] Count-up animation on KPI numbers
- [ ] Skeleton loaders for charts
- [ ] Recharts Bar chart for top products (replace inline progress bars)

### POS (built, feature-thin)
- [ ] Shift open / close flow
- [ ] Hold / void / discount UI
- [ ] Sidebar role-guard verification

### Service Quality (Tier 2 & 3)
- [ ] Tier 2 self-heal buttons (clear-cache, restart-worker, reseed-routing, warm-cache)
- [ ] Tier 3 scheduled diagnostics + alerting

### Phase 2
- [ ] `apps/tracking` separate service
- [ ] DHL / external carrier integration
- [ ] Customer accounts (overlaps with Customer-facing above)

### Phase 3
- [ ] React Native mobile app

### Prod cutover (LAST — only after everything above is done & QA-signed-off on staging)
- [ ] Final staging regression pass (auth, checkout, payments, POS, courier, CMS, analytics)
- [ ] Rotate any keys leaked in chat / commits
- [ ] Purchase `trendmarga.com` and point DNS to prod web
- [ ] Set prod env vars on Railway (`PAYSTACK_SECRET_KEY` live, `WEB_APP_URL`, `CLERK_*`, `WHATSAPP_*`, feature flags)
- [ ] Run prod migrations (`pnpm migrate:prod`)
- [ ] Register prod Paystack webhook URL
- [ ] Promote `staging` → `main`
- [ ] ₵1 LIVE smoke on prod (MoMo + card)
- [ ] Enable scheduled reconciler + monitoring alerts
