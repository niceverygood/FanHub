# FanHub — Agent Instructions

FanHub is a **creator paid-content marketplace** ("거래소" model). Limited-supply Drops,
a live creator chart, per-content purchases, and a collection of owned content are the core
mechanics. Payments are involved, so the money-handling rules below are non-negotiable.

## Stack (do not change)

- **Framework:** Next.js 14 (App Router) + TypeScript **strict** mode
- **DB:** PostgreSQL + Prisma — **migrations only, never `prisma db push`**
- **Cache/queue:** Redis (ioredis) — sessions, rate-limit, chart aggregation cache
- **Storage:** S3-compatible (local dev = MinIO via docker-compose)
- **Auth:** Auth.js (NextAuth v5) — credentials + email, **DB session strategy**
- **Payments:** custom, behind a `PaymentProvider` interface (Mock + CCBill stub)
- **Validation:** every API input validated with **zod**. `any` is banned.
- **Tests:** Vitest. Payment/ledger logic is not considered merged without tests.
- **Local env:** one `docker compose up` brings up postgres + redis + minio.

## Money-handling invariants (violation = stop and report)

1. All amounts are integer **KRW (`Int`)**. No float/decimal arithmetic on money.
2. **Never UPDATE a balance column** — balances are derived as `SUM(LedgerEntry)`.
   The fee rate lives in the DB `Setting` table (basis points, integer), not env.
3. All state transitions use **conditional UPDATE** (optimistic). No read-then-write.
4. Rate-limit every payment-related API (Redis, keyed by IP + userId).
5. Refund = append reversing `LedgerEntry` + revoke Entitlement. The ledger is
   **append-only** — never edit or delete existing rows.
6. Secrets live in env only (`.env.example` is committed; `.env` is not).

## Hard "do not" list

- Do not treat a client success-redirect as proof of payment — the webhook is the only truth.
- Do not compute amounts or fee rates on the frontend.
- Do not decrement Drop stock with an application-level read-then-write.
- Do not edit/delete ledger rows.
- Do not include real adult content — all seeds/placeholders are abstract gradients.
- Do not wire real PSP keys — CCBill stays a stub.

## Local development

```bash
docker compose up -d           # postgres + redis + minio
pnpm install
pnpm prisma:migrate            # apply migrations (never db push)
pnpm db:seed                   # 5 creators / 20 contents / 3 drops
pnpm dev
```
