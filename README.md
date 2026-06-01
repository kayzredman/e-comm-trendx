# trendMarga

Single-tenant B2C e-commerce platform built for the Ghanaian market. Mobile-first storefront, unified CMS back-office, analytics dashboard, and real-time service health monitoring. Built to scale into Phase 2 with payments, POS, courier tracking, and a React Native mobile app.

---

## Brand System (May 2026)

**Wordmark**: `trendMarga` — lowercase camelCase with custom flat-bottom `t` glyph + emphasized capital `M` pivot + animated emerald pulse dot.

| Token              | Hex        | Usage                              |
|--------------------|------------|------------------------------------|
| Cobalt (primary)   | `#1E40AF`  | `trendM` portion of wordmark, brand surfaces |
| Cobalt-light (dark)| `#60A5FA`  | Wordmark on dark backgrounds       |
| Ash                | `#9CA3AF`  | `arga` portion of wordmark         |
| Ink                | `#0A0A0B`  | Favicon tile, `theme-color`, app shell |
| Pulse (emerald)    | `#10B981`  | Pulse dot only — do not reuse for UI |

**Font**: [Clash Display](https://www.fontshare.com/fonts/clash-display) weights 500/600/700 via Fontshare CDN (loaded in `apps/web/app/layout.tsx`). Inter remains the body font.

**Component**: `apps/web/components/brand/Logo.tsx` — `<Logo variant="wordmark|mark|letter" tone="auto|light|dark|mono" withPulse?>` and `<LogoMark />` for the favicon tile. Always use the component — never typeset "trendMarga" by hand.

**Favicon set**: `apps/web/public/{favicon.svg,apple-touch-icon.svg,icons/icon-{192,512}.svg}` — ink tile + bold flat-bottom `t` + cobalt `M` + emerald dot (dot drops below 24px).

**Scope**: brand surfaces only. The `@trendmarga/*` workspace package names and `trendmarga.com` domain are intentionally preserved. Hubtel SMS `HUBTEL_SENDER_ID` also kept (pre-registered with Ghana telcos).

---

## Tech Stack

### Monorepo

| Tool | Version | Purpose |
|------|---------|---------|
| [Turborepo](https://turbo.build) | 2.x | Monorepo build orchestration, caching |
| [pnpm](https://pnpm.io) | 9.4.0 | Package manager + workspaces |

### Frontend — `apps/web`

| Technology | Version | Notes |
|-----------|---------|-------|
| [Next.js](https://nextjs.org) | 16.2.6 | App Router, Turbopack dev mode |
| [React](https://react.dev) | 19.2.4 | |
| [TypeScript](https://www.typescriptlang.org) | 5.x | Strict mode |
| [Tailwind CSS](https://tailwindcss.com) | 4.x | Utility-first CSS, mobile-first |
| [Clerk](https://clerk.com) | 6.x | Auth — admin/staff only; guests checkout unauthenticated |
| [Recharts](https://recharts.org) | 3.8.x | Dashboard charts (line, pie/donut) |
| [Lucide React](https://lucide.dev) | 0.469.x | Icon library |
| [Zustand](https://zustand-demo.pmnd.rs) | 5.x | Cart state (persisted to localStorage) |
| [Clash Display](https://www.fontshare.com/fonts/clash-display) | Fontshare CDN | Brand display font (wordmark + favicon) |

### Backend — `apps/api`

| Technology | Version | Notes |
|-----------|---------|-------|
| [NestJS](https://nestjs.com) | 10.3.x | Modular monolith |
| [Fastify](https://fastify.dev) | 4.28.x | HTTP adapter (replaces Express) |
| [TypeScript](https://www.typescriptlang.org) | 5.4.x | |
| [Clerk Backend SDK](https://clerk.com/docs/backend-requests/handling/manual-jwt) | 1.3.x | JWT verification guard |
| [Zod](https://zod.dev) | 3.23.x | Runtime validation + env schema |

### Database & ORM — `packages/db`

| Technology | Version | Notes |
|-----------|---------|-------|
| [PostgreSQL](https://www.postgresql.org) | 15 | Hosted on Railway |
| [Drizzle ORM](https://orm.drizzle.team) | 0.31.x | Schema, migrations, typed queries |
| [postgres.js](https://github.com/porsager/postgres) | 3.4.4 | PostgreSQL client driver |
| [drizzle-kit](https://orm.drizzle.team/kit-docs/overview) | 0.22.x | Migrations + introspection CLI |
| [@paralleldrive/cuid2](https://github.com/paralleldrive/cuid2) | 2.2.x | Collision-resistant IDs |

### Infrastructure

| Service | Purpose |
|---------|---------|
| [Railway](https://railway.app) | Hosting — all environments (dev, staging, prod) |
| [Clerk](https://clerk.com) | Authentication + user management |

---

## Project Structure

```
trendX/
├── apps/
│   ├── web/                        # Next.js 16 App Router
│   │   ├── app/
│   │   │   ├── (storefront)/       # Public — no auth
│   │   │   │   ├── page.tsx        # CMS-driven homepage (hero carousel, sections)
│   │   │   │   ├── products/       # Product listing + detail pages
│   │   │   │   ├── cart/           # Cart page (Zustand + localStorage)
│   │   │   │   ├── checkout/       # Guest checkout form
│   │   │   │   └── orders/[id]/    # Order confirmation + live status tracker
│   │   │   └── (dashboard)/        # Clerk-gated (admin/staff)
│   │   │       ├── dashboard/      # Analytics overview (6 stats, charts, tables)
│   │   │       ├── pos/            # POS Terminal (in-store sales, shifts, holds)
│   │   │       └── cms/
│   │   │           ├── products/   # Product CRUD
│   │   │           ├── categories/ # Category CRUD
│   │   │           ├── orders/     # Order management + status updates
│   │   │           ├── customers/  # Customer profiles + order history
│   │   │           ├── content/    # Site content (hero, banners, sections)
│   │   │           ├── delivery/   # Delivery zones + settings
│   │   │           ├── users/      # Team management (OWNER only)
│   │   │           └── service-quality/  # Service health monitoring (OWNER/MANAGER)
│   │   ├── components/
│   │   │   ├── cms/                # CMS UI components (Sidebar, tables, forms)
│   │   │   └── storefront/         # Storefront UI (HeroCarousel, ProductCard, etc.)
│   │   └── lib/
│   │       └── api.ts              # Typed API client (all fetch helpers + types)
│   └── api/                        # NestJS 10 on Fastify 4
│       └── src/
│           ├── auth/               # ClerkGuard, RolesGuard, @Roles() decorator
│           ├── products/           # Products + Categories module
│           ├── orders/             # Orders module, status transitions
│           ├── customers/          # Customers module
│           ├── analytics/          # Dashboard stats, revenue series, top products
│           ├── cms/                # Site sections CRUD
│           ├── delivery/           # Delivery zones + fee calculation
│           ├── storefront/         # Public REST (no auth) — Phase 2 React Native ready
│           ├── health/             # Service health checks + proactive reconnect
│           ├── pos/                # POS module (orders, shifts, holds, registers)
│           └── users/              # Admin user management, Clerk webhook sync
├── packages/
│   ├── db/                         # Drizzle ORM schema + migrations
│   │   ├── src/schema/             # All table definitions
│   │   └── drizzle/                # Migration files
│   ├── types/                      # Shared TypeScript types across apps
│   ├── config/                     # Zod env validation (shared)
│   └── ui/                         # ShadCN/UI base components (Phase 2 expansion)
└── scripts/
    └── seed-commerce.ts            # Demo data: 60 customers, 150 orders, 283 items
```

---

## Database Schema

```
users           — admin/staff (Clerk-synced), role: OWNER | MANAGER | CONTENT_EDITOR | ORDER_MANAGER | STAFF | CASHIER | VIEWER
categories      — id, name, slug, parent_id, image_url
products        — id, name, slug, description, price, compare_price, sku, inventory,
                  category_id, images[], status (ACTIVE | DRAFT | ARCHIVED)
customers       — id, name, email, phone, address_json, created_at
orders          — id, customer_id, status, subtotal, delivery_fee, total, notes,
                  payment_method (CASH_ON_DELIVERY | MOBILE_MONEY | CARD)
order_items     — order_id, product_id, quantity, unit_price
cms_sections    — id, page, type (HERO|BANNER|FEATURED|TESTIMONIALS|ANNOUNCEMENT),
                  data jsonb, order, is_active
delivery_zones  — id, name, base_fee, fee_strategy, fee_per_km, free_threshold, is_active
delivery_settings — global defaults (default_strategy, estimated_days_min/max)
```

**Order status flow:**
```
PENDING → CONFIRMED → PROCESSING → OUT_FOR_DELIVERY → DELIVERED
                                                     ↘ CANCELLED (from any state)
```

---

## RBAC — Role Access

| Role | Access |
|------|--------|
| `OWNER` | Full access — all CMS, team management, service quality, settings |
| `MANAGER` | Dashboard, all CMS modules, service quality — no team management |
| `STAFF` | Orders, customers, delivery — operational access |
| `CASHIER` | POS terminal only — in-store sales, shifts, holds |
| `VIEWER` | Dashboard + read-only views |

---

## API Modules

| Module | Base Path | Auth | Description |
|--------|-----------|------|-------------|
| Auth | — | Clerk JWT | Guard + webhook user sync |
| Users | `/users` | ClerkGuard + RolesGuard | Team CRUD, Clerk webhook |
| Products | `/products` | ClerkGuard + RolesGuard | Products + categories CRUD |
| Orders | `/orders` | ClerkGuard + RolesGuard | Order management, status transitions |
| Customers | `/customers` | ClerkGuard + RolesGuard | Customer CRUD, order history |
| Analytics | `/analytics` | ClerkGuard + RolesGuard | Dashboard stats, revenue series, top products |
| CMS | `/cms` | ClerkGuard + RolesGuard | Site sections CRUD |
| Delivery | `/delivery` | ClerkGuard + RolesGuard | Zones + fee calculator |
| Storefront | `/v1` | **Public** | Guest browse + place order (REST for Phase 2 RN) |
| Health | `/health` | Public ping / OWNER+MANAGER for services | Service health checks |
| POS | `/pos` | ClerkGuard + RolesGuard (OWNER/MANAGER/CASHIER) | In-store orders, shifts, holds, registers |

---

## Environment Variables

### `apps/web/.env.local`

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_API_URL=http://localhost:4001
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
```

### `apps/api/.env`

```env
DATABASE_URL=postgresql://user:pass@host:port/db
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
PORT=4001
```

> ⚠️ Never commit `.env` or `.env.local` files. Both are in `.gitignore`.

---

## Development Setup

### Prerequisites

- Node.js ≥ 20
- pnpm 9.4.0 (`npm i -g pnpm@9.4.0`)
- PostgreSQL (or Railway DB URL)

### Install

```bash
git clone https://github.com/kayzredman/e-comm-trendx.git
cd e-comm-trendx
pnpm install
```

### Configure env files

```bash
cp apps/web/.env.example apps/web/.env.local   # fill in Clerk keys + API URL
cp apps/api/.env.example apps/api/.env          # fill in DATABASE_URL + Clerk keys
```

### Database migrations

```bash
cd packages/db
pnpm drizzle-kit migrate
```

### Seed demo data

```bash
# From repo root
./node_modules/.pnpm/node_modules/.bin/tsx scripts/seed-commerce.ts
```

### Run dev servers

```bash
# Terminal 1 — API (port 4001)
cd apps/api
pnpm dev

# Terminal 2 — Web (port 4002)
cd apps/web
pnpm dev
```

Or with Turborepo from root:

```bash
pnpm dev
```

---

## Key Conventions

- **Mobile-first CSS**: base styles = 375px. Use `sm:` / `md:` / `lg:` for wider screens.
- **CSS custom properties**: `var(--color-primary)`, `var(--color-surface)`, `var(--color-text)`, `var(--color-text-muted)`, `var(--color-border)`, `var(--color-page)` — defined in `apps/web/app/globals.css`.
- **Storefront API is REST** (not tRPC) — designed from day 1 to support React Native in Phase 2. All storefront endpoints live under `/v1/`.
- **tRPC = CMS/dashboard internal only** (if introduced in Phase 2).
- **No multi-tenancy** in Phase 1. Single store, single owner.
- **Guest checkout** — customers don't need accounts. Order tracking via order ID.
- **API response envelope**: `{ data, error, message }` — frontend never hard-crashes on failed requests.

---

## Deployment — Railway

### Branch → Environment

| Branch | Railway Environment | URL |
|--------|---------------------|-----|
| `dev` | Development | `trendmarga-dev.up.railway.app` |
| `staging` | Staging | `trendmarga-staging.up.railway.app` |
| `main` | Production | `trendmarga.com` |

### Services per environment

| Service | App | Port |
|---------|-----|------|
| `web` | `apps/web` (Next.js) | 3000 |
| `api` | `apps/api` (NestJS) | 4001 |
| `db` | PostgreSQL | 5432 |
| `redis` | Redis (Phase 2) | 6379 |

### Deploy

```bash
git push origin dev       # deploys to Railway dev environment
git push origin staging   # deploys to staging (after PR merge)
git push origin main      # deploys to production
```

---

## Git Workflow

```
feature/* ──► dev ──► staging ──► main
               ↑
          active dev
```

- Feature branches from `dev`
- Merge to `dev` freely (direct push or PR)
- `dev → staging`: PR when ready for online QA
- `staging → main`: reviewed PR only — production deploys

---

## Phase 1 — Build Status

| Sprint | Scope | Status |
|--------|-------|--------|
| S1 | Monorepo, DB schema, Clerk auth, NestJS bootstrap | ✅ Done |
| S2 | Products + Categories (backend + CMS UI) | ✅ Done |
| S3 | Orders + Customers + Delivery (backend + CMS UI) | ✅ Done |
| S4 | Dashboard analytics (charts, revenue, order stats) | ✅ Done |
| S5 | CMS content module (homepage sections, hero carousel) | ✅ Done |
| S6 | Storefront (product listing, cart, checkout, order tracking) | ✅ Done |
| S7 | Service Quality, RBAC, health API, enhancements | 🔄 In progress |
| — | PWA manifest | ⬜ Pending |
| — | Delivery fee calculator (all strategies) | ⬜ Pending |
| — | Railway prod deploy | ⬜ Pending |

---

## Phase 2 — Planned (Not Started)

- **POS module** — in-store sales, walk-in orders, receipt generation. Shared `orders` table with `source: ONLINE | POS` field.
- **Tracking service** (`apps/tracking`) — courier API integration (DHL, local carriers), SSE push to storefront. If down: last-known status shown from DB.
- **Customer accounts** — login, order history, saved addresses.
- **React Native app** — mobile storefront. Storefront API is REST from day 1 to support this.

## Shipped (post-Phase 1)

- **Payments** (June 2026) — Paystack live (card / MoMo / bank), webhook receiver with HMAC verification, in-process circuit breaker, 5-min reconciler, admin UI at `/cms/payments`. COD remains the fallback when `payments` feature flag is off or the breaker is OPEN. Runbook: [apps/api/src/payments/README.md](apps/api/src/payments/README.md).
- **Redis + BullMQ** — background jobs: order notifications, report generation.
- **Google Maps Distance Matrix** — distance-based delivery fee calculation.
