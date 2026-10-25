# Factory Resume

A daily recovery-planning tool for e-commerce fulfilment the day after a
disruption removes half the population — and with it, half the workforce,
half the couriers, and half the customers.

The scenario: a fictional personal-care and hygiene brand ("Fernwell") has
60 of its usual ~120 fulfilment staff, in the wrong mix for the work. Its
remaining customers are stockpiling essentials and buying far less of
everything else. Every morning the operations manager has to decide who
works where, which partners to bring in, and which orders ship — and the
answer changes daily as partners come online and stock runs down.

Three ideas carry the product:

- **Redeployment, not just allocation.** Workers have cross-skills (a
  picker can pack at 60% speed after 2h of ramp-up). The engine moves
  people to the bottleneck when that lifts the line, and never into or out
  of certified-only work like quality inspection.
- **Priority from need, not a label.** Each SKU is tagged essential,
  everyday or discretionary. Priority is derived from that and the due date,
  so every ranking can be explained ("Essential · due in 1d").
- **A daily loop, not a one-off plan.** Check in who showed up → plan →
  report end-of-shift actuals → recalibrate → plan tomorrow. Plan accuracy
  is measured, not assumed.

Every result is compared against a "business as usual" counterfactual run
through the same engine: everyone on their own task, no partners,
first-due-first-shipped.

[`plan.md`](./plan.md) is the original build brief; this README describes
what was actually built.

## Requirements

- Node.js 20+
- [pnpm](https://pnpm.io) (the project is pinned to pnpm via `packageManager` in `package.json`)

## Setup

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). No API keys or
external services are required — all data is local, fictional, and the
recovery engine runs entirely client/server-side with no network calls.

## Other commands

```bash
pnpm build   # production build (also type-checks)
pnpm start   # run the production build
pnpm test    # run the engine test suite (vitest)
pnpm lint    # eslint
python3 scripts/build_case_pdf.py   # rebuild the 2-page product case PDF (needs reportlab)
```

## Walking through the app

1. **Overview** (`/`) — the plan vs. business as usual over a 5-day
   outlook (essentials on time, units shipped, backlog, spend per extra
   unit), and how the binding constraint moves day by day.
2. **Daily loop** (`/today`) — run the loop by hand: edit the morning
   check-in, see the plan rebuild, enter end-of-shift actuals, close the
   day. Plan accuracy and recalibrated productivity are tracked per day.
3. **Workforce** (`/workforce`) — the redeployments in today's plan with
   what each costs and gains, required vs. qualified vs. cross-trainable
   staff per task, and the roster's cross-skills.
4. **Outsourcing** (`/outsourcing`) — partners live today (prorated by
   activation time), partners to request today for tomorrow, and why
   volume is capped at what the rest of the line can ship.
5. **Recovery Plan** (`/recovery`) — today's order-by-order plan with need,
   derived priority and its reason, and the limiting factor (capacity,
   inventory or last mile), plus a manager approval action.
6. **Scenarios** (`/scenarios`) — stress-test the 5-day outlook: more
   staff lost, a partner outage, a different demand mix, a regional demand
   collapse, courier loss, or a stock delay.

## How it works

All operational data is fictional and lives in `lib/data/` (products with
essentiality tags, the order backlog, workforce with cross-skills, tasks,
inventory with replenishments, providers, last-mile lanes, and
pre-disruption daily demand). The recovery engine in `lib/engine/` is a set
of pure, deterministic functions with no I/O:

- `prioritiseOrders` — derives each order's priority from essentiality and
  due date, with a one-line reason.
- `calculateWorkforceRequirements` — required labour hours and staffing
  gaps per task, separating certified from cross-trainable staff.
- `allocateWorkforce` — own-skill staffing (mandatory tasks first), then
  line balancing: moves one cross-skilled worker at a time to the
  worst-covered task while that lifts the weaker of the two.
- `evaluateOutsourcing` — matches the remaining gap to partners by cost
  and location, counting only the share of today each partner is live,
  buying only what the line can ship, and advising which slow partners to
  request now.
- `generateRecoveryPlan` — one day's plan: resolves per-order fulfilment
  against capacity, usable inventory and last-mile capacity, in priority
  order. `strategy: "unmanaged"` gives the business-as-usual counterfactual.
- `closeDay` / `projectOutlook` — the daily loop: ship, roll over, add new
  orders at the shifted demand, land replenishments, bring requested
  partners online, recalibrate from actuals.
- `simulateScenario` — runs baseline and scenario outlooks and diffs them.

Because the engine is pure and synchronous, every page computes the plan
directly (no loading states needed) and the Scenarios page recalculates
instantly in the browser as controls change.

The engine is covered by a test suite (`pnpm test`) exercising
needs-based priority, cross-skilled redeployment and its guardrails,
partner activation timing, line-capped outsourcing, inventory and
last-mile constraints, the daily loop's rollover and recalibration, and
the plan beating business as usual — see `tests/`.

## Project structure

```text
app/            Pages (overview, workforce, outsourcing, recovery, scenarios)
components/     UI components (shadcn/ui primitives, plus recovery/ and scenarios/)
lib/data/       Fictional fixtures and the data model
lib/engine/     The deterministic recovery engine
lib/format.ts   Display formatting helpers
tests/          Engine test suite (vitest)
```

## Scope

This is a prototype, not a production system: it uses simulated data, has
no backend or persistence (check-ins, actuals, scenario edits and plan
approval are local UI state), and does not integrate with real marketplaces, warehouse
management systems, or logistics APIs. See `plan.md` sections 2 and 10 for
the full in-scope/out-of-scope breakdown and acceptance criteria.
