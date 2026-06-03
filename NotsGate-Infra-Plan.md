# NotsGate — Holding-Co Infrastructure Plan

> **Model:** NotsGate Ltd is the parent holding company. It registers and owns
> every product domain (`trendmarga.com`, `lotris.com`, `qodeio.com`, …) but
> each product presents independently to its users. Same pattern as Alphabet →
> Google / YouTube / Waymo. Last updated: June 3, 2026.

---

## Architecture

```
NotsGate Ltd  (Ghana legal entity — registers + owns all domains)
   │  centralised billing, infra, secrets
   │
   ├─ notsgate.com               ← portfolio site: "Our products" → links out
   │   ├─ admin.notsgate.com     ← cross-product admin SSO (later)
   │   ├─ status.notsgate.com    ← public uptime for all products (later)
   │   └─ docs.notsgate.com      ← developer docs hub (later)
   │
   ├─ trendmarga.com             ← Product 1: e-commerce (this repo)
   ├─ lotris.com                 ← Product 2: helpdesk KPI system
   ├─ qodeio.com                 ← Product 3
   └─ resu-dog.com               ← Product 4 (future)
```

Customers on `trendmarga.com` never need to know NotsGate exists. The parent
shows up only in WHOIS / legal / billing.

---

## Per-service account map (one parent, products as sub-resources)

| Service | Parent account | Per-product resource |
|---|---|---|
| **Cloudflare Registrar + DNS** | NotsGate org | Zone per domain |
| **Railway** | NotsGate team | Project per product (dev/staging/prod envs each) |
| **GitHub** | `notsgate` org | Repo per product (move `e-comm-trendx` → `notsgate/trendmarga`) |
| **Clerk** | NotsGate org | Application per product (prod + dev each) |
| **Resend** | NotsGate org | Verified domain per product |
| **Google Cloud** | NotsGate org | Project per product (separate billing line items) |
| **Google Workspace** | `notsgate.com` | Aliases (`orders@trendmarga.com → admin@notsgate.com`) — one seat covers all |
| **Paystack** | NotsGate Ltd merchant | Sub-account per product for split settlement & reporting |
| **Hubtel SMS** | NotsGate Ltd account | Sender ID per product (`TrendMarga`, `Lotris`, …) |
| **1Password / Bitwarden** | NotsGate Teams | Vault per product + shared "Infra" vault |

**Why this wins:** marginal cost of product N ≈ Railway compute + Postgres + ~$10/yr domain. Zero per-product account setup overhead.

---

## Registrar choice — Cloudflare Registrar

- At-cost (~$9.77/yr `.com`) — no markup, no renewal-jump pricing
- Single Cloudflare org owns all zones → one API token can manage every product's DNS
- Free WAF + CDN + DDoS protection in front of every Railway service
- Free email routing (`orders@trendmarga.com → admin@notsgate.com`) — no Workspace seat needed per product
- Free 2FA, registrar lock, WHOIS privacy proxy
- Use **Namecheap or registrar.com.gh** only for country-code TLDs Cloudflare doesn't sell

**WHOIS / registrant record (set on every domain):**
```
Registrant Organization: NotsGate Ltd
Registrant Name:         <legal name>
Registrant Email:        admin@notsgate.com
Registrant Address:      <Ghana business address>
```
Public WHOIS shows Cloudflare Privacy Proxy; legal ownership = NotsGate Ltd.

---

## Domains — purchase plan

**Batch 1 (buy together, ~$40 total):**
1. `notsgate.com` — parent identity, email anchor, internal subdomains
2. `trendmarga.com` — Product 1 launching soon
3. `lotris.com` — Lotris already a real codebase (cheap insurance)
4. `qodeio.com` — if Qodeio is a near-term product

**Defensive (optional, skip unless brand-sensitive):**
- `notsgate.org`, `notsgate.io`

**Defer (buy when ~30 days from product launch):**
- `resu-dog.com` and future product names

---

## Cutover sequence

### Phase A — NotsGate plumbing (do once, benefit forever)
1. Confirm **NotsGate Ltd** registered with Ghana RGD (gates Paystack live)
2. Create one **Cloudflare account** with email `admin@notsgate.com` (or Gmail for now) + 2FA
3. **Buy batch-1 domains** (~$40) — all registrant = NotsGate Ltd
4. Create **GitHub org `notsgate`** — move repos in later (don't break CI today)
5. Create **Google Workspace on `notsgate.com`** (1 seat: `admin@notsgate.com`) + Cloudflare Email Routing for per-product aliases
6. Set up **1Password/Bitwarden Teams** vault "NotsGate Infra" — seed with current secrets

### Phase B — TrendMarga as first NotsGate product (this repo)
7. Cloudflare zone for `trendmarga.com` → DNS records (apex, www, api, MX for email routing, SPF, DKIM, DMARC)
8. **Resend** — verify `trendmarga.com` → grab prod API key
9. **Paystack KYC** — submit NotsGate Ltd cert; TrendMarga as DBA/trading name OR sub-account
10. **Clerk prod app** for `trendmarga.com` (`pk_live_…` / `sk_live_…`)
11. **Railway prod env** for trendmarga project (already have staging) — wire custom domain `trendmarga.com` + `api.trendmarga.com`
12. Run prod migrations (`pnpm migrate:prod`), register Paystack webhook, ₵1 live smoke
13. Enable `SQ_ALERTS_ENABLED=true` with your Ghana phone in `SQ_ALERT_PHONES`

### Phase C — notsgate.com portfolio site (after TrendMarga is live)
- Separate small repo `notsgate/notsgate-web`
- Astro or Next.js static export — one page: hero + grid of product cards → each links to its product domain
- Cloudflare Pages (free) or Railway

### Phase D — Future products inherit infra
- New repo in `notsgate` org → new Railway project under same team → new Cloudflare zone (1 click) → DNS via the `infra/cloudflare-bootstrap.sh` template script
- Marginal cost of product N ≈ Railway compute + Postgres + ~$10/yr domain
- Process: 1 day instead of 1 sprint

---

## Codebase changes to make this real (proposed, not yet done)

When ready, scaffold in this repo (or extract to `notsgate/infra` repo eventually):

```
infra/
  dns/
    trendmarga.com.yaml     ← declarative DNS records, idempotent
    lotris.com.yaml         ← (future) per product
  cloudflare-bootstrap.sh   ← reads YAML, applies via Cloudflare API
  railway/
    trendmarga.env.example  ← exact ~30 env vars per prod product
  README.md                 ← "how to launch a NotsGate product in 1 day"
```

This is **not on the critical path** for TrendMarga launch — but turns TrendMarga
into the reference template so launching product 2/3/N becomes a checklist.

---

## Hard rules

- **Every domain registered with `NotsGate Ltd` as registrant org.** Never as personal name.
- **All secrets in 1Password/Bitwarden NotsGate vault.** Never in chat, never in commits.
- **Customer-facing surfaces never mention NotsGate** unless you decide to (portfolio site is the exception).
- **Per-product WHOIS, billing, sub-accounts** stay separated so any single product is sellable / spinnable-out without disentangling 4 others.

---

## Open decisions (locked-in when answered)

1. **NotsGate Ltd Ghana RGD registration status?** (yes / in-progress / not-yet) — gates Paystack live
2. **Batch-1 domain list final?** Default: `notsgate.com` + `trendmarga.com` + `lotris.com` + `qodeio.com` (~$40)
3. **Scaffold `infra/` template now, or after TrendMarga is in prod?**
4. **Paystack model:** single NotsGate merchant with sub-accounts per product, OR separate merchants per product? Default rec: **single merchant + sub-accounts**
5. **Google Workspace seat count:** 1 (admin only) or 3 (admin + ops + finance)?

---

## Cross-references

- This product's launch checklist: [TrendMarga-Plan.md](TrendMarga-Plan.md) — "Prod cutover (next milestone — admin + ops checklist)" section
- Service Quality operator SOP: [TrendMarga-Plan.md](TrendMarga-Plan.md) — "Service Quality — Operator SOP" section
- User memory: `/memories/notsgate-holding-co.md` (cross-workspace notes for kayzredman)
