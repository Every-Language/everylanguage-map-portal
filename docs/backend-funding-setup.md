---
title: Backend funding setup
description: Stripe/Supabase Edge Functions contract and idempotency guidance
---

This document describes the minimal backend contract expected by the frontend funding flow and recommended hardening.

## Edge functions

- create-sponsorship-checkout
  - Request body:
    - purpose: "operations" | "adoption"
    - donor: { firstName, lastName, email, phone? }
    - mode: "card" | "bank_transfer"
    - donateOnlyCents?: number (ops one-time) | adoptionIds?: string[]
  - Response body:
    - { customerId, depositClientSecret?, clientSecret?, subscriptionId?, adoptionSummaries? }
  - Notes:
    - Use Stripe automatic_payment_methods OR restrict to card with payment_method_types: ['card'] to hide Link/Bank.
    - Honor idempotency (below) to avoid duplicate Customers/PIs under React StrictMode or retries.
    - Subscriptions API: when using `items[].price_data`, you must pass a `product` ID, not `product_data`. Either:
      1) create a reusable Product in your dashboard (e.g. "Language Sponsorship") and reference it:
         ```ts
         items: [{ price_data: { currency: 'usd', unit_amount: recurring, recurring: { interval: 'month' }, product: STRIPE_SPONSORSHIP_PRODUCT_ID } }]
         ```
      2) or create a Price ahead of time and pass `price: 'price_...'` instead of `price_data`.

- stripe-webhook
  - Handle payment_intent.succeeded/payment_intent.payment_failed/invoice.paid to update tables:
    - stripe_events, contributions, sponsorships, language_adoptions

- crm-lead-intake
  - Non-blocking intake of donor details to HubSpot. Return 200 regardless (log errors server-side).

## Idempotency

Frontend sends a deterministic key per attempt:

```
Idempotency-Key: el:{intent}:{email}:{adoptionIdsCsv}:{totalCents}:{currency}
```

Use this as the Stripe idempotency key for:

- customers.create (if you are creating customers ad-hoc)
- paymentIntents.create
- subscriptions.create

Also cache any created sponsorship row keyed by the same key so a duplicate call returns the same {customerId, clientSecret, subscriptionId} without creating new records.

## RLS and anon access

- language_adoptions: allow anon SELECT where status = 'available'.
- All writes remain service role only from edge functions.

## Environment

- STRIPE_SECRET_KEY
- SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

Optional:

- HUBSPOT_API_KEY


