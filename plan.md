# Factory Resume — Product & Engineering Build Plan

## 1. Product definition

**Factory Resume is an AI-powered operations recovery and capacity optimisation tool for e-commerce businesses.**

It helps an operations manager decide how to fulfil orders when a sudden disruption reduces the available workforce, warehouse capacity, manufacturing capacity or logistics coverage.

The product combines three decisions:
1. **Workforce planning:** How many workers are required, and how should the available workforce be allocated?
2. **Outsourcing:** Which activities or order volumes should move to external partners?
3. **Recovery planning:** Given the available people, inventory, machines, partners and deadlines, what is the best feasible operating plan?

The application must demonstrate these decisions working together. It should not be merely a dashboard with an AI chatbot.

## 2. Scope of the first version

Build a prototype for a fictional D2C personal-care brand operating an e-commerce fulfilment centre.

### The scenario

A major disruption has reduced the brand's available workforce by 50%. It still has customer orders, inventory, warehouse operations and logistics partners, but its fulfilment capacity is insufficient to meet normal demand.

The manager needs to decide:
- Which orders to prioritise.
- How to allocate the surviving workers.
- How much capacity to outsource.
- Which orders will still be delayed.
- How the plan changes if a partner becomes unavailable.

Use simulated data. Do not spend time integrating real marketplaces, warehouse management systems or logistics APIs.

### What is in scope?

- Operations overview.
- Workforce requirement and allocation.
- Outsourcing recommendations.
- Recovery-plan generation.
- Scenario comparison.
- AI-powered explanation of the results.
- Manager approval of the proposed plan.

### What is out of scope?

- Automatically booking external providers.
- Real employee scheduling or payroll.
- Autonomous machine control.
- Live marketplace integrations.
- Training a custom AI model.
- Building a full manufacturing execution system.

## 3. Recommended technology stack

Use a single TypeScript application to keep development fast and the code easy to debug.

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js + React + TypeScript | Web application and page routing |
| Styling | Tailwind CSS + shadcn/ui | Consistent, polished interface |
| Charts | Recharts | Capacity, orders and scenario comparisons |
| Icons | Lucide | Interface icons |
| Data | Local TypeScript/JSON fixtures | Simulated operational data |
| Optimisation | Pure TypeScript functions | Staffing, allocation and outsourcing calculations |
| AI | Optional LLM API integration | Explain results and interpret follow-up questions |
| Persistence | Local state initially | Scenario edits and approval interactions |

**Important:** The application should run without an AI API key. The optimisation engine must work independently of the LLM.

## 4. User journey

Build the application around one continuous workflow.

### Step 1 — Open the operations overview

The manager lands on an overview of the disrupted business.

Display:
- Orders requiring fulfilment.
- Internal fulfilment capacity.
- Available versus required workforce.
- Estimated capacity shortfall.
- Orders at risk of missing their deadlines.
- Current outsourcing capacity.

The interface should immediately answer: “What is the state of my operation, and where is the biggest problem?”

### Step 2 — Analyse workforce capacity

Create a workforce planning page that displays the available workforce by skill and task.

Example task categories:
- Picking.
- Packing and labelling.
- Quality inspection.
- Inventory exceptions.
- Dispatch coordination.

For each task, calculate:
- Required labour hours.
- Available qualified labour hours.
- Staffing shortfall.
- Expected output per shift.

Allow the manager to adjust available workers or working hours and recalculate the allocation.

The system should not allocate workers to tasks for which they lack the required qualifications.

### Step 3 — Generate outsourcing recommendations

Create a page listing eligible activities and external providers.

Each provider should have:
- Service type.
- Available daily capacity.
- Cost per order or unit.
- Activation time.
- Geographic coverage.
- Quality or service constraints.

For each recommendation, display:
- What work to outsource.
- Why outsourcing is recommended.
- Estimated cost.
- Expected additional throughput.
- Orders recovered or delays avoided.
- Any limitations or risks.

The system must respect confirmed capacity. It must not assume that an external provider can accept unlimited work.

### Step 4 — Generate a recovery plan

The recovery engine combines internal staffing, internal fulfilment capacity, external capacity and order priorities.

The plan should show:
- Internal workload allocation.
- Proposed external workload.
- Expected orders fulfilled.
- Orders still at risk.
- Estimated incremental cost.
- Key operational constraints.

Allow the manager to approve the plan or modify its assumptions.

### Step 5 — Simulate a disruption

Provide scenario controls such as:
- Another 20% of available workers become unavailable.
- An external fulfilment partner loses half its capacity.
- A shipment of packaging materials is delayed.
- Order volume increases by 15%.

Recalculate the plan and compare the outcome against the baseline.

This is the most important interactive demonstration: the product should respond to changing operational conditions, not simply display fixed recommendations.

## 5. Data model

Create the following entities in `lib/data/`.

### Orders

Each order or order group should contain:
- `id`
- `sku`
- `quantity`
- `priority`
- `dueAt`
- `location`
- `requiredProcessingSteps`
- `unitValue`

Use aggregated order groups initially rather than modelling thousands of individual customer orders.

### Workforce

Each worker group should contain:
- `skill`
- `availableWorkers`
- `hoursPerShift`
- `productivityPerHour`
- `qualification`
- `taskEligibility`

Represent workers in groups by skill for the MVP. Individual employee-level scheduling is unnecessary.

### Tasks

Each operational task should contain:
- `id`
- `name`
- `labourHoursPerUnit`
- `requiredSkill`
- `maxThroughput`
- `prerequisites`
- `outsourcingEligible`

### Inventory

Each SKU should contain:
- `sku`
- `availableQuantity`
- `reservedQuantity`
- `location`
- `replenishmentETA`

Only usable, unreserved inventory should count towards fulfilment capacity.

### External providers

Each provider should contain:
- `id`
- `name`
- `services`
- `availableCapacity`
- `costPerUnit`
- `activationHours`
- `supportedLocations`
- `qualityRequirements`

### Scenarios

Each scenario should contain:
- `id`
- `name`
- `workforceAvailability`
- `providerCapacityOverrides`
- `demandMultiplier`
- `materialAvailabilityOverrides`
- `recoveryResult`

## 6. Build the optimisation engine

Create `lib/engine/`. Keep business logic separate from the React components.

### Function A — Calculate workforce requirements

`calculateWorkforceRequirements(orders, tasks, workforce)`

For each task:

Required labour hours = Required task volume × Labour hours per unit.

Required workers = Required labour hours ÷ Productive hours per worker.

Round staffing requirements up where workers cannot be fractional, and account for skills and task eligibility.

The engine should calculate the gap between required and available qualified labour rather than treating all workers as interchangeable.

### Function B — Allocate available workforce

`allocateWorkforce(requirements, workforce, priorities)`

For the MVP, use a deterministic, priority-based allocation algorithm.

1. Reserve the minimum qualified staffing needed for mandatory quality and safety activities.
2. Rank remaining tasks using order urgency, business impact and operational dependencies.
3. Allocate eligible workers to the highest-priority tasks first.
4. Respect shift hours, skill constraints and task capacity.
5. Report unfilled requirements and resulting capacity limits.

Do not claim that this is mathematically globally optimal. It is a transparent baseline heuristic.

### Function C — Evaluate outsourcing options

`evaluateOutsourcing(internalCapacity, providerCapacity, orders, costs)`

For each eligible task:
1. Calculate the internal capacity shortfall.
2. Identify external providers that meet the location, service and timing requirements.
3. Estimate the cost of shifting work to each eligible provider.
4. Check provider capacity and material availability.
5. Estimate the additional throughput and orders recovered.
6. Compare outsourcing against internal alternatives such as overtime or reallocation, where data is available.

The result should include the assumptions used and why each option was accepted or rejected.

### Function D — Generate a recovery plan

`generateRecoveryPlan(scenario)`

This function orchestrates the other three functions.

Its output should include:
- Recommended internal allocations.
- Recommended outsourced volumes.
- Total expected fulfilment.
- Unfulfilled demand.
- Orders at risk.
- Incremental operating cost.
- Constraint violations.
- Explanation data for the UI.

Enforce material availability, provider capacity, processing dependencies and delivery deadlines. If no feasible plan can fulfil all orders, return the best feasible plan and explicitly identify the remaining shortfall.

### Function E — Simulate changes

`simulateScenario(baseline, changes)`

Apply changes to workforce, demand, inventory or provider availability, then rerun the recovery engine.

Return the changed outcome and a comparison against the baseline.

## 7. AI layer

Implement the AI layer only after the deterministic engine is working.

The AI assistant should answer questions such as:
- “Why are these orders at risk?”
- “Why are you recommending outsourcing this activity?”
- “What happens if this provider becomes unavailable?”
- “Which assumptions have the greatest impact on fulfilment?”

Give the model the structured results produced by the engine. Require it to explain those results rather than inventing capacities, costs or allocations.

For the initial demo, prewritten explanations generated from engine output are acceptable. An API-backed conversational assistant is optional.

## 8. Suggested project structure

```text
factory-resume/
├── app/
│   ├── page.tsx
│   ├── workforce/page.tsx
│   ├── outsourcing/page.tsx
│   ├── recovery/page.tsx
│   └── scenarios/page.tsx
├── components/
│   ├── layout/
│   ├── dashboard/
│   ├── workforce/
│   ├── outsourcing/
│   ├── recovery/
│   └── scenarios/
├── lib/
│   ├── data/
│   │   ├── orders.ts
│   │   ├── workforce.ts
│   │   ├── inventory.ts
│   │   └── providers.ts
│   ├── engine/
│   │   ├── workforce.ts
│   │   ├── allocation.ts
│   │   ├── outsourcing.ts
│   │   ├── recovery.ts
│   │   └── simulation.ts
│   ├── calculations/
│   └── types.ts
├── tests/
└── README.md
```

Adapt the structure to the framework's conventions if needed.

## 9. Implementation sequence

### Phase 1 — Scaffold and sample data

- Create the application.
- Set up the layout, navigation and visual design.
- Define the data types.
- Generate consistent fictional data for orders, workforce, inventory and providers.

**Exit criterion:** The application runs and all screens can access the same dataset.

### Phase 2 — Build the calculation engine

- Implement workforce requirement calculations.
- Implement the allocation heuristic.
- Implement provider eligibility and outsourcing cost calculations.
- Combine them into a recovery plan.
- Add basic tests for capacity, inventory and skill constraints.

**Exit criterion:** Given a fixed input scenario, the engine returns a repeatable, internally consistent recovery plan.

### Phase 3 — Build the operations dashboard

- Add summary metrics.
- Add order status and capacity breakdowns.
- Display the main constraints and operational bottlenecks.
- Link the summary metrics to the workforce and recovery pages.

**Exit criterion:** The dashboard reflects the actual engine results rather than hardcoded numbers.

### Phase 4 — Build workforce and outsourcing screens

- Display required versus available staffing.
- Show recommended allocations.
- Show eligible external providers and capacity.
- Explain the cost and throughput trade-offs.

**Exit criterion:** A manager can understand why a specific allocation or outsourcing recommendation was made.

### Phase 5 — Build recovery simulation

- Add controls for workforce loss, demand changes and provider outages.
- Recalculate the plan when the inputs change.
- Show baseline versus new outcomes.
- Add an approve-plan interaction.

**Exit criterion:** Changing an assumption visibly changes the calculated plan and its metrics.

### Phase 6 — Polish and validate

- Add loading, empty and error states where appropriate.
- Test infeasible scenarios.
- Check that totals reconcile across all screens.
- Improve the interface for a live product demo.
- Add a README with setup and run instructions.
- Record a short walkthrough or package a runnable prototype.

**Exit criterion:** The application can be demonstrated from the initial disruption through a recovery recommendation without manually editing code.

## 10. Acceptance criteria

The prototype is ready when:

- The dashboard identifies the workforce and fulfilment shortfalls.
- Staffing calculations respect skills and productive hours.
- Outsourcing recommendations respect provider capacity and eligibility.
- The recovery plan accounts for available inventory and task dependencies.
- Scenario changes trigger recalculation.
- Baseline and alternative scenarios can be compared.
- The UI uses calculated outputs, not unrelated hardcoded metrics.
- Infeasible plans clearly expose remaining gaps.
- The application runs reliably from a fresh setup.

## 11. Final product principle

**Build the decision engine first, the interface second, and AI third.**

The product's value is the quality and feasibility of the recovery plan. The dashboard makes the situation understandable, and AI makes the recommendations easier to explore. Neither should substitute for the underlying operational calculations.
