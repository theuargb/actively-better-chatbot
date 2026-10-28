# Plans, billing and model access

A **plan** is a row in `plan`. It carries a price, a `code` (namespaces its
rate-limit env keys), and a `tier` (an integer; higher = more access).

## Effective plan

A user's effective plan is the higher-`tier` of:

- the plan an admin assigned (`user.plan_id`), and
- the plan of an active/trialing Stripe subscription (`subscription` table).

On a tie the subscription wins so the pricing page shows what the user pays for.
No plan = tier 0. Code: `src/lib/plan/effective-plan.ts`, `src/lib/plan/server.ts`.

The effective plan's `code` feeds the existing `AI_RATE_LIMIT_PLAN_<CODE>_*`
limits, so a subscriber gets the limits of the plan they pay for.

## Model access

`model_access (provider, model, min_tier)`. A model without a row is open to
everyone (tier 0). Admins edit rows at **Admin → Model access**.

Enforcement is server-side and fail-closed:

| Surface | Behaviour when locked |
| --- | --- |
| `POST /api/chat`, `/api/chat/temporary`, `/api/chat/title`, `/api/agent/ai` | `403`, body `AI_MODEL_LOCKED\|<model>\|<plan name>` |
| Server actions `generateObjectAction`, `generateExampleToolSchemaAction` | throws `ModelLockedError` |
| Workflow LLM nodes and tool-parameter generation | throws, node fails |
| `GET /api/chat/models` | every model returned with `locked` + `requiredPlanName`; picker shows a lock and links to `/pricing` |

The model is resolved first (`customModelProvider.resolveModel`), so an unknown
model name is judged as the fallback model that would actually serve it.
`requiredPlanName` is the cheapest active plan whose tier meets the model's
`min_tier`; `null` means no active plan unlocks it.

## Stripe

Billing is off unless both `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are
set. Without them plans still work as admin assignments and the pricing page
hides checkout.

Setup:

1. In Stripe create a recurring **monthly** price (and optionally an annual one)
   per paid plan, in `PLAN_CURRENCY`.
2. Admin → Plans: paste the `price_…` id into the plan. Saving reads the price
   from Stripe and stores its amount, so the displayed price cannot drift from
   what Checkout charges. A plan with a Stripe price id has an immutable `code`
   (Stripe subscriptions reference it).
3. Add a webhook endpoint `https://<host>/api/auth/stripe/webhook` with events
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`; put its signing secret in
   `STRIPE_WEBHOOK_SECRET`.
4. Enable the Stripe Billing Portal; "Manage billing" on `/pricing` uses it for
   cancel / payment method changes.

Stripe customers are created on first checkout, never at sign-up. Deleting an
account cancels its active subscriptions first.

## Schema

Migration `0021_legal_yellowjacket.sql`: `plan.tier`, `plan.annual_price`,
`plan.stripe_price_id`, `plan.stripe_annual_price_id` (unique), `user.stripe_customer_id`,
`subscription`, `model_access`. Existing plans get tier `1`.
