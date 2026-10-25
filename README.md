# Factory Resume

An operations recovery and capacity optimisation prototype for e-commerce
fulfilment. It helps an operations manager decide how to fulfil orders when
a sudden disruption reduces available workforce, warehouse capacity, or
logistics coverage — by combining workforce allocation, outsourcing
recommendations, and recovery planning into one feasible plan.

The scenario: a fictional D2C personal-care brand ("Fernwell") has lost a
large share of its fulfilment workforce. It still has orders, inventory,
and logistics partners, but not enough capacity to meet normal demand. The
app shows where the shortfall is, what to prioritise, what to outsource,
and what happens if conditions get worse.

See [`plan.md`](./plan.md) for the full product and engineering brief this
was built from.

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
```

## Walking through the app

1. **Overview** (`/`) — the current state of the operation: capacity
   shortfall by task, orders at risk, and the biggest bottlenecks.
2. **Workforce** (`/workforce`) — required vs. available staffing per task,
   and the priority order the recovery engine uses when workers are scarce.
3. **Outsourcing** (`/outsourcing`) — which external providers are
   recommended for which shortfall, why, at what cost, and the risks
   involved.
4. **Recovery Plan** (`/recovery`) — the full plan: every order's fulfilled
   quantity, shortfall, and limiting factor (capacity or inventory), plus a
   manager approval action.
5. **Scenarios** (`/scenarios`) — simulate a disruption (additional
   workforce loss, a provider losing capacity, a demand spike, or a
   delayed shipment) and see exactly how the plan and its metrics change,
   compared against the baseline.

## How it works

All operational data is fictional and lives in `lib/data/` (orders,
workforce, tasks, inventory, external providers). The recovery engine in
`lib/engine/` is a set of pure, deterministic functions with no I/O:

- `calculateWorkforceRequirements` — required labour hours and staffing
  gaps per task, respecting skill eligibility.
- `allocateWorkforce` — a transparent priority heuristic: mandatory
  (non-outsourceable) tasks are staffed first, then everything else by a
  demand-weighted priority score.
- `evaluateOutsourcing` — matches shortfalls to eligible external
  providers by cost, location, and activation time, never exceeding a
  provider's confirmed capacity.
- `generateRecoveryPlan` — orchestrates the above and resolves per-order
  fulfilment against both capacity and usable inventory, in priority order.
- `simulateScenario` — reruns the plan under a set of overrides and diffs
  the result against a baseline.

Because the engine is pure and synchronous, every page computes the plan
directly (no loading states needed) and the Scenarios page recalculates
instantly in the browser as controls change.

The engine is covered by a test suite (`pnpm test`) exercising skill
eligibility, mandatory-task reservation, provider capacity limits, and
inventory-constrained fulfilment — see `tests/`.

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
no backend or persistence (scenario edits and plan approval are local UI
state), and does not integrate with real marketplaces, warehouse
management systems, or logistics APIs. See `plan.md` sections 2 and 10 for
the full in-scope/out-of-scope breakdown and acceptance criteria.
