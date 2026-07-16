# FanHub Production Runbook

Updated: 2026-07-16

## Launch Gates

- Legal counsel has reviewed the Terms, Privacy, Content Policy, Billing Policy, DMCA/Rights process, and creator agreements for every launch country.
- Payment provider has explicitly approved the content category, webhook flow, refund flow, chargeback handling, and payout model.
- Creator onboarding requires KYC approval before publish and payout.
- Every uploaded adult content item has creator attestation for age, consent, rights, and distribution authority.
- Admin users have separate accounts, strong passwords or SSO, and least-privilege access to Supabase and Vercel.
- Production environment variables are configured only in Vercel/Supabase, never committed.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass before production deploy.

## Daily Operations

- Review `/admin` queues for open reports, pending KYC, pending payouts, and recent orders.
- Check payment webhook failures, duplicate event IDs, and orders stuck in `PENDING`.
- Reconcile paid orders, entitlements, ledger entries, and provider settlement exports.
- Review chargebacks and refund requests before creator/host payout release.
- Monitor Vercel runtime errors, build failures, and Supabase advisor warnings.

## Trust And Safety SLA

- Minor or non-consensual content suspicion: restrict content immediately, preserve logs, escalate to the safety owner.
- Rights/takedown request: acknowledge within one business day, restrict obvious violations, request missing proof when needed.
- Harassment, impersonation, or doxxing: restrict offending content/account while investigating.
- Repeat severe violations: ban account, freeze unpaid balances where legally allowed, document the decision in audit logs.

## Payment Controls

- Only use providers that explicitly allow the live content category.
- Webhook processing must be idempotent by provider event ID.
- Paid order, entitlement, and ledger entries must be created in one database transaction.
- Refunds and chargebacks must revoke entitlement and write reversal ledger entries.
- Payouts require KYC approval, positive ledger balance, and no unresolved safety/payment hold.

## Database Controls

- Keep application tables under Prisma migrations.
- Run Supabase database advisors before production schema changes.
- Keep foreign keys indexed and avoid public views that bypass RLS.
- Do not expose service-role keys to browser code or `NEXT_PUBLIC_` variables.
- Keep `_prisma_migrations` private; if exposed schema warnings appear, review with the Supabase Data API settings before changing access.

## Incident Response

1. Freeze the affected account/content/payment flow.
2. Preserve audit logs, webhook payload IDs, order IDs, and admin actions.
3. Identify whether the incident is safety, payment, privacy, availability, or legal.
4. Notify affected parties and providers when required.
5. Patch, test, deploy, and document the permanent fix.
