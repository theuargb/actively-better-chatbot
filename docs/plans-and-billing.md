# Plans, billing and model access

A **plan** is a row in `plan`. It carries a price, a `code` (its key in
`AI_RATE_LIMITS.plans`), and a `tier` (an integer; higher = more access). Plans
are listed by tier, then price, everywhere.

## Effective plan

A user's effective plan is the higher-`tier` of:

- the plan an admin assigned (`user.plan_id`), and
- the plan of an active/trialing Stripe subscription (`subscription` table).

On a tie the subscription wins so the pricing page shows what the user pays for.
No plan = tier 0. Code: `src/lib/plan/effective-plan.ts`, `src/lib/plan/server.ts`.

The effective plan's `code` selects `AI_RATE_LIMITS.plans["<code>"]`, so a
subscriber gets the limits of the plan they pay for.

## Configuration (env, JSON)

Identity-keyed settings are one JSON value per env var, with exact keys (role
name, plan code, `"<provider>/<model>"` as shown in the picker), so Cyrillic and
punctuation in model names never collide:

```sh
AI_MODEL_MIN_TIERS={"US/Claude 4":2,"Еней/Юрист Еней":1}
AI_RATE_LIMITS={"roles":{"user":{"perHour":30,"perDay":200,"maxChatLen":40}},"plans":{"plus":{"perDay":500}},"models":{"US/Claude 4":{"perDay":50}}}
```

Malformed JSON, negative tiers or unknown limit fields stop the app at boot
(`src/lib/env-config-check.ts`). Model keys missing from the registry and the
old `AI_RATE_LIMIT_{ROLE,PLAN,MODEL}_*` vars are logged and ignored.

Migrating old rate-limit vars: `AI_RATE_LIMIT_PLAN_PLUS_PER_DAY=500` becomes
`{"plans":{"plus":{"perDay":500}}}`; `PER_HOUR`/`PER_DAY`/`MAX_CHAT_LEN` map to
`perHour`/`perDay`/`maxChatLen`; role and model keys use the exact identity.

## Model access

`AI_MODEL_MIN_TIERS` maps a model to its minimum plan tier. An unlisted model is
open to everyone (tier 0).

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
minimum tier; `null` means no active plan unlocks it.

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
4. Enable the Stripe Billing Portal with subscription updates and
   cancellation allowed. `/pricing` uses it for "Manage billing", for switching
   an existing subscription to another plan, and for "Cancel subscription"
   (Stripe's hosted cancel confirmation). "Resume subscription" undoes a
   scheduled cancellation without leaving the app.

`/pricing` shows one card per active plan, ordered by tier, plus a synthesized
Free card unless an active tier-0 plan exists. Each card lists the models it
newly unlocks (from `AI_MODEL_MIN_TIERS`), and the cheapest purchasable plan
above the user's tier is marked Recommended. The user menu's first entry shows
the current plan (`GET /api/user/plan`) with an Upgrade badge when a higher
purchasable plan exists.

Stripe customers are created on first checkout, never at sign-up. Deleting an
account cancels its active subscriptions first.

## Schema

Migration `0021_legal_yellowjacket.sql`: `plan.tier`, `plan.annual_price`,
`plan.stripe_price_id`, `plan.stripe_annual_price_id` (unique), `user.stripe_customer_id`,
`subscription`. Existing plans get tier `1`. Migration `0022_mixed_menace.sql`
drops the short-lived `model_access` table; export it first with
`select provider||'/'||model, min_tier from model_access;` into
`AI_MODEL_MIN_TIERS`.
