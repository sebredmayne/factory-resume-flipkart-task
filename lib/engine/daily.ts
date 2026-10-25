import type {
  Essentiality,
  InventoryItem,
  OrderInput,
  RecoveryPlan,
  Scenario,
  WorkforceAvailabilityOverride,
} from "@/lib/types";
import {
  applyScenario,
  generateRecoveryPlan,
  type BaseData,
  type PlanStrategy,
} from "@/lib/engine/recovery";

// The daily re-planning loop. A crisis isn't planned once — the plan is
// wrong by noon. Each day runs:
//
//   morning check-in -> plan -> end-of-shift actuals -> recalibrate -> next day
//
// Unshipped orders roll over (and re-rank as they age), new orders arrive at
// the scenario's shifted demand, replenishments land on their ETA, partners
// requested yesterday come online, and each task's productivity is nudged
// toward what the floor actually achieved.

export interface Shipment {
  orderId: string;
  date: string;
  quantity: number;
  essentiality: Essentiality;
  onTime: boolean;
}

export interface KnownOrder {
  quantity: number;
  dueAt: string;
  essentiality: Essentiality;
}

export interface DayRecord {
  dayIndex: number;
  date: string;
  plannedUnits: number;
  actualUnits: number;
  planAccuracy: number; // actual / planned, 1 when nothing was planned
  essentialShipped: number;
  cost: number;
  newOrderUnits: number;
  backlogEndUnits: number;
}

export interface DayState {
  dayIndex: number;
  date: string;
  backlog: OrderInput[];
  inventory: InventoryItem[];
  providerRequestDay: Record<string, number>;
  calibration: Record<string, number>;
  knownOrders: Record<string, KnownOrder>;
  shipments: Shipment[];
  history: DayRecord[];
}

// Units processed per task at end of shift, as reported by the floor.
export type TaskActuals = Record<string, number>;

export function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function essentialityOf(data: BaseData, sku: string): Essentiality {
  return data.products.find((p) => p.sku === sku)?.essentiality ?? "everyday";
}

export function initialDayState(
  data: BaseData,
  scenario: Scenario,
  today: string
): DayState {
  const knownOrders: Record<string, KnownOrder> = {};
  for (const order of data.orders) {
    knownOrders[order.id] = {
      quantity: order.quantity,
      dueAt: order.dueAt,
      essentiality: essentialityOf(data, order.sku),
    };
  }
  return {
    dayIndex: 0,
    date: today,
    backlog: data.orders,
    inventory: applyScenario(data, scenario).inventory,
    providerRequestDay: {},
    calibration: {},
    knownOrders,
    shipments: [],
    history: [],
  };
}

export function planDay(
  state: DayState,
  data: BaseData,
  scenario: Scenario,
  strategy: PlanStrategy = "managed",
  checkIn?: WorkforceAvailabilityOverride[]
): RecoveryPlan {
  return generateRecoveryPlan(
    {
      ...scenario,
      workforceAvailability: checkIn ?? scenario.workforceAvailability,
      // Stock overrides were applied once, in the initial state; after that
      // the loop carries inventory forward itself.
      materialAvailabilityOverrides: [],
    },
    { ...data, orders: state.backlog, inventory: state.inventory },
    state.date,
    {
      dayIndex: state.dayIndex,
      providerRequestDay: state.providerRequestDay,
      calibration: state.calibration,
      strategy,
    }
  );
}

// Units each task is planned to process today: everything planned to ship
// passes through every step on its route.
export function plannedTaskUnits(plan: RecoveryPlan): Record<string, number> {
  const units: Record<string, number> = {};
  const orderById = new Map(plan.orders.map((o) => [o.id, o] as const));
  for (const f of plan.orderFulfilment) {
    const order = orderById.get(f.orderId);
    if (!order) continue;
    for (const taskId of order.requiredProcessingSteps) {
      units[taskId] = (units[taskId] ?? 0) + f.fulfilledQuantity;
    }
  }
  return units;
}

const MIN_CALIBRATION = 0.3;
const MAX_CALIBRATION = 1.5;

export function closeDay(
  state: DayState,
  plan: RecoveryPlan,
  data: BaseData,
  scenario: Scenario,
  actuals?: TaskActuals
): DayState {
  const planned = plannedTaskUnits(plan);
  const actualFor = (taskId: string) =>
    Math.max(0, actuals?.[taskId] ?? planned[taskId] ?? 0);

  // What actually shipped: an order only ships as far as the
  // worst-performing step on its route let it.
  const orderById = new Map(plan.orders.map((o) => [o.id, o] as const));
  const shippedByOrder = new Map<string, number>();
  for (const f of plan.orderFulfilment) {
    if (f.fulfilledQuantity <= 0) continue;
    const order = orderById.get(f.orderId)!;
    const ratio = order.requiredProcessingSteps.reduce((min, taskId) => {
      const p = planned[taskId] ?? 0;
      return p > 0 ? Math.min(min, actualFor(taskId) / p) : min;
    }, 1);
    shippedByOrder.set(f.orderId, Math.floor(f.fulfilledQuantity * Math.min(1, ratio)));
  }

  const shipments: Shipment[] = [...state.shipments];
  for (const [orderId, quantity] of shippedByOrder) {
    if (quantity <= 0) continue;
    const order = orderById.get(orderId)!;
    shipments.push({
      orderId,
      date: state.date,
      quantity,
      essentiality: order.essentiality,
      onTime: state.date <= order.dueAt,
    });
  }

  // Recalibrate internal productivity toward what the floor achieved,
  // halfway each day so one bad shift doesn't swing the next plan.
  const calibration = { ...state.calibration };
  if (actuals) {
    const outsourcedByTask: Record<string, number> = {};
    for (const rec of plan.outsourcedVolumes) {
      outsourcedByTask[rec.taskId] = (outsourcedByTask[rec.taskId] ?? 0) + rec.recommendedVolume;
    }
    for (const allocation of plan.internalAllocations) {
      const taskId = allocation.taskId;
      if (actuals[taskId] === undefined) continue;
      const p = planned[taskId] ?? 0;
      const internalPlanned = Math.min(p, allocation.resultingCapacity);
      if (internalPlanned <= 0) continue;
      const outsourcedPlanned = Math.max(0, p - internalPlanned);
      const internalActual = Math.max(0, actualFor(taskId) - outsourcedPlanned);
      const observed = Math.min(1.2, internalActual / internalPlanned);
      const current = calibration[taskId] ?? 1;
      calibration[taskId] = Math.min(
        MAX_CALIBRATION,
        Math.max(MIN_CALIBRATION, current * (0.5 + 0.5 * observed))
      );
    }
  }

  const nextDate = addDays(state.date, 1);

  const backlog = state.backlog
    .map((o) => ({ ...o, quantity: o.quantity - (shippedByOrder.get(o.id) ?? 0) }))
    .filter((o) => o.quantity > 0);

  const shippedBySku = new Map<string, number>();
  for (const [orderId, quantity] of shippedByOrder) {
    const sku = orderById.get(orderId)!.sku;
    shippedBySku.set(sku, (shippedBySku.get(sku) ?? 0) + quantity);
  }
  const inventory = state.inventory.map((item) => {
    let availableQuantity = item.availableQuantity - (shippedBySku.get(item.sku) ?? 0);
    let { replenishmentETA, replenishmentQuantity } = item;
    if (replenishmentETA && replenishmentETA <= nextDate) {
      availableQuantity += replenishmentQuantity;
      replenishmentETA = null;
      replenishmentQuantity = 0;
    }
    return { ...item, availableQuantity: Math.max(0, availableQuantity), replenishmentETA, replenishmentQuantity };
  });

  // Orders placed during today, at the scenario's shifted demand.
  const knownOrders = { ...state.knownOrders };
  const newOrders: OrderInput[] = [];
  data.dailyDemand.forEach((row, i) => {
    const essentiality = essentialityOf(data, row.sku);
    const locationMultiplier =
      scenario.locationDemand.find((l) => l.location === row.location)?.multiplier ?? 1;
    const quantity = Math.round(
      row.unitsPerDay * scenario.demandShift[essentiality] * locationMultiplier
    );
    if (quantity <= 0) return;
    const id = `N${state.dayIndex + 1}-${String(i + 1).padStart(2, "0")}`;
    const dueAt = addDays(nextDate, row.dueInDays - 1);
    newOrders.push({
      id,
      sku: row.sku,
      quantity,
      dueAt,
      location: row.location,
      requiredProcessingSteps: row.requiredProcessingSteps,
      unitValue: row.unitValue,
    });
    knownOrders[id] = { quantity, dueAt, essentiality };
  });

  // Every partner the plan used or flagged is requested today.
  const providerRequestDay = { ...state.providerRequestDay };
  for (const id of [
    ...plan.outsourcedVolumes.map((r) => r.providerId),
    ...plan.providerRequests.map((r) => r.providerId),
  ]) {
    if (providerRequestDay[id] === undefined) providerRequestDay[id] = state.dayIndex;
  }

  const actualUnits = [...shippedByOrder.values()].reduce((s, q) => s + q, 0);
  const plannedUnits = plan.totalExpectedFulfilment;
  const nextBacklog = [...backlog, ...newOrders];

  const record: DayRecord = {
    dayIndex: state.dayIndex,
    date: state.date,
    plannedUnits,
    actualUnits,
    planAccuracy: plannedUnits > 0 ? actualUnits / plannedUnits : 1,
    essentialShipped: [...shippedByOrder]
      .filter(([id]) => orderById.get(id)!.essentiality === "essential")
      .reduce((s, [, q]) => s + q, 0),
    cost: plan.incrementalCost,
    newOrderUnits: newOrders.reduce((s, o) => s + o.quantity, 0),
    backlogEndUnits: nextBacklog.reduce((s, o) => s + o.quantity, 0),
  };

  return {
    dayIndex: state.dayIndex + 1,
    date: nextDate,
    backlog: nextBacklog,
    inventory,
    providerRequestDay,
    calibration,
    knownOrders,
    shipments,
    history: [...state.history, record],
  };
}

export interface OutcomeSummary {
  days: number;
  shippedUnits: number;
  essentialDueUnits: number; // essential units due within the window
  essentialOnTimeUnits: number;
  essentialOnTimeRate: number; // 0-1
  endBacklogUnits: number;
  cost: number;
}

// Outcome over the days the loop has closed. "Essential on time" counts
// essential units due inside the window that shipped on or before their
// due date — the north-star metric.
export function summariseOutcome(state: DayState): OutcomeSummary {
  const lastDate = state.history.at(-1)?.date ?? state.date;
  let essentialDueUnits = 0;
  for (const order of Object.values(state.knownOrders)) {
    if (order.essentiality === "essential" && order.dueAt <= lastDate) {
      essentialDueUnits += order.quantity;
    }
  }
  const essentialOnTimeUnits = state.shipments
    .filter(
      (s) =>
        s.essentiality === "essential" &&
        s.onTime &&
        state.knownOrders[s.orderId].dueAt <= lastDate
    )
    .reduce((sum, s) => sum + s.quantity, 0);

  return {
    days: state.history.length,
    shippedUnits: state.history.reduce((s, d) => s + d.actualUnits, 0),
    essentialDueUnits,
    essentialOnTimeUnits,
    essentialOnTimeRate: essentialDueUnits > 0 ? essentialOnTimeUnits / essentialDueUnits : 1,
    endBacklogUnits: state.backlog.reduce((s, o) => s + o.quantity, 0),
    cost: state.history.reduce((s, d) => s + d.cost, 0),
  };
}

export interface Outlook {
  plans: RecoveryPlan[];
  finalState: DayState;
  summary: OutcomeSummary;
}

// Runs the loop forward assuming each day's plan executes as planned —
// the 3-day outlook a manager sees before committing.
export function projectOutlook(
  data: BaseData,
  scenario: Scenario,
  today: string,
  days = 3,
  strategy: PlanStrategy = "managed"
): Outlook {
  let state = initialDayState(data, scenario, today);
  const plans: RecoveryPlan[] = [];
  for (let d = 0; d < days; d++) {
    const plan = planDay(state, data, scenario, strategy);
    plans.push(plan);
    state = closeDay(state, plan, data, scenario);
  }
  return { plans, finalState: state, summary: summariseOutcome(state) };
}
