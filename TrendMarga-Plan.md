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

- `apps/web` — Next.js 15 App Router (storefront + dashboard + CMS)
- `apps/api` — NestJS on Fastify (core monolith)
- `apps/payment` — NestJS on Fastify (Phase 2 — payment gateway service, isolated)
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
7. StorefrontModule — public REST endpoints (browse products, place order) — REST not tRPC so React Native can consume in Phase 2
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

- Tailwind CSS + ShadCN/UI
- Tremor charts for dashboard analytics
- Mobile-first, fully responsive storefront (PWA-ready)
- Phase 2: React Native mobile storefront app — REST API designed to support this from day 1

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
- `api` — NestJS monolith (apps/api) — products, orders, customers, cms, delivery, storefront, analytics
- `db` — PostgreSQL
- `redis` — Redis (cache, Phase 2 BullMQ)

**Phase 2 additions (separate Railway services):**
- `payment` — NestJS service (apps/payment) — Paystack / Stripe webhooks, payment state machine, refunds
- `tracking` — NestJS service (apps/tracking) — courier API integration, webhook receiver, tracking event log, push to frontend via SSE

Each Phase 2 service gets its own Railway service entry, its own env vars, its own deploy pipeline, and fails independently. If `payment` is down, orders still flow (cash-on-delivery fallback). If `tracking` is down, order status still shows last known state from DB.

---

## Service Resilience

### Phase 1 — Modular monolith (intentional)
- `apps/web` and `apps/api` are separate processes on separate Railway services
- If `api` is down: Next.js continues serving static/cached pages; storefront shows graceful empty states
- If `db` is down: API returns 503; web shows fallback UI
- All API responses use consistent `ApiResponse<T>` envelope — frontend never hard-crashes on failed requests

### Phase 2 — Service isolation for payment + tracking
- **Payment service** (`apps/payment`) runs independently. If it's down:
  - Checkout still accepts orders (cash-on-delivery is always available as fallback)
  - Online payment option is hidden/disabled client-side when health check fails
  - No cascading failure into `apps/api`
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

---

## Decisions

- Single-tenant (no multi-tenancy in Phase 1)
- Railway for all environments — no Vercel
- Branch strategy: dev (play) → staging (test online) → main (prod)
- Payment integration = Phase 2 (cash on delivery default in Phase 1)
- POS = Phase 2
- Courier tracking API = Phase 2
- Customer accounts = Phase 2
- React Native mobile app = Phase 2
- Storefront API = REST (not tRPC) to support React Native later
- tRPC = dashboard/CMS internal use only
- Delivery fees: all strategies configurable (flat, distance, free threshold, combined)
- Distance delivery = Google Maps Distance Matrix API

---

## Phase 2 (Deferred)

- **Payment service** (`apps/payment`) — separate Railway service
  - Paystack (Ghana primary) + Stripe (international)
  - Webhook receiver, payment state machine, refund flows
  - If down: cash-on-delivery fallback keeps checkout alive
- **Tracking service** (`apps/tracking`) — separate Railway service
  - Courier API integration (DHL, local carriers)
  - Webhook receiver, tracking event log
  - SSE push to storefront order status page
  - If down: last-known status shown from DB, no crash
- POS module
- Customer accounts / login
- React Native mobile storefront app
