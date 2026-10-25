import type {
  DailyDemand,
  ExternalProvider,
  InventoryItem,
  LastMileLane,
  OrderFulfilment,
  OrderInput,
  Product,
  RecoveryPlan,
  Scenario,
  Task,
  WorkforceGroup,
} from "@/lib/types";
import { calculateWorkforceRequirements, taskDemandVolume } from "@/lib/engine/workforce";
import { allocateWorkforce } from "@/lib/engine/allocation";
import { evaluateOutsourcing } from "@/lib/engine/outsourcing";
import {
  compareOrdersByDueDate,
  compareOrdersByUrgency,
  prioritiseOrders,
} from "@/lib/engine/priority";

export interface BaseData {
  orders: OrderInput[];
  products: Product[];
  tasks: Task[];
  workforce: WorkforceGroup[];
  inventory: InventoryItem[];
  providers: ExternalProvider[];
  lastMile: LastMileLane[];
  dailyDemand: DailyDemand[];
}

interface AdjustedData {
  workforce: WorkforceGroup[];
  inventory: InventoryItem[];
  providers: ExternalProvider[];
  lastMile: LastMileLane[];
}

// "managed" is the Factory Resume plan. "unmanaged" is the counterfactual a
// floor falls back to without one — everyone on their own task, no
// partners, orders shipped first-due-first — so the plan's value is
// measured against something real rather than asserted.
export type PlanStrategy = "managed" | "unmanaged";

export interface PlanContext {
  dayIndex?: number;
  providerRequestDay?: Record<string, number>;
  calibration?: Record<string, number>;
  strategy?: PlanStrategy;
}

// Applies a scenario's overrides on top of the base operational data.
// Overrides replace a single entity's value; anything not named in the
// scenario is left untouched. Demand shift doesn't touch today's backlog —
// those orders already exist — it shapes the new orders the daily loop
// generates.
export function applyScenario(data: BaseData, scenario: Scenario): AdjustedData {
  const workforce = data.workforce.map((group) => {
    const override = scenario.workforceAvailability.find(
      (o) => o.groupId === group.id
    );
    return override
      ? { ...group, availableWorkers: override.availableWorkers }
      : group;
  });

  const providers = data.providers.map((provider) => {
    const override = scenario.providerCapacityOverrides.find(
      (o) => o.providerId === provider.id
    );
    return override
      ? { ...provider, availableCapacity: override.availableCapacity }
      : provider;
  });

  const inventory = data.inventory.map((item) => {
    const override = scenario.materialAvailabilityOverrides.find(
      (o) => o.sku === item.sku
    );
    return override
      ? { ...item, availableQuantity: override.availableQuantity }
      : item;
  });

  const lastMile = data.lastMile.map((lane) => {
    const override = scenario.lastMileOverrides.find(
      (o) => o.location === lane.location
    );
    return override ? { ...lane, capacityPerDay: override.capacityPerDay } : lane;
  });

  return { workforce, inventory, providers, lastMile };
}

function pickLimitingFactor(
  capacity: number,
  inventory: number,
  lastMile: number
): OrderFulfilment["limitingFactor"] {
  const smallest = Math.min(capacity, inventory, lastMile);
  if (capacity === smallest) return "capacity";
  if (inventory === smallest) return "inventory";
  return "last_mile";
}

// Function D — orchestrates A, B and C for one day, then resolves per-order
// fulfilment against task capacity (internal + outsourced), usable
// inventory and last-mile capacity, processing the backlog in priority
// order so essential, urgent orders claim scarce capacity first.
export function generateRecoveryPlan(
  scenario: Scenario,
  data: BaseData,
  today: string,
  context: PlanContext = {}
): RecoveryPlan {
  const {
    dayIndex = 0,
    providerRequestDay = {},
    calibration = {},
    strategy = "managed",
  } = context;
  const managed = strategy === "managed";
  const adjusted = applyScenario(data, scenario);
  const orders = prioritiseOrders(data.orders, data.products, today);

  const workforceRequirements = calculateWorkforceRequirements(
    orders,
    data.tasks,
    adjusted.workforce
  );
  const { allocations: internalAllocations, redeployments } = allocateWorkforce(
    workforceRequirements,
    data.tasks,
    adjusted.workforce,
    orders,
    { allowRedeployment: managed, calibration }
  );
  const { recommendations: outsourcedVolumes, requestAdvice: providerRequests } =
    managed
      ? evaluateOutsourcing(
          data.tasks,
          orders,
          internalAllocations,
          adjusted.providers,
          today,
          { dayIndex, providerRequestDay }
        )
      : { recommendations: [], requestAdvice: [] };

  const outsourcedByTaskId = new Map<string, number>();
  for (const rec of outsourcedVolumes) {
    outsourcedByTaskId.set(
      rec.taskId,
      (outsourcedByTaskId.get(rec.taskId) ?? 0) + rec.recommendedVolume
    );
  }

  const taskRemainingCapacity = new Map<string, number>();
  for (const allocation of internalAllocations) {
    taskRemainingCapacity.set(
      allocation.taskId,
      allocation.resultingCapacity + (outsourcedByTaskId.get(allocation.taskId) ?? 0)
    );
  }

  const inventoryRemaining = new Map<string, number>();
  for (const item of adjusted.inventory) {
    inventoryRemaining.set(
      item.sku,
      Math.max(0, item.availableQuantity - item.reservedQuantity)
    );
  }

  const lastMileRemaining = new Map<string, number>();
  for (const lane of adjusted.lastMile) {
    lastMileRemaining.set(lane.location, lane.capacityPerDay);
  }

  const constraintViolations: string[] = [];
  const orderFulfilment: OrderFulfilment[] = [];
  const sortedOrders = [...orders].sort(
    managed ? compareOrdersByUrgency : compareOrdersByDueDate
  );

  for (const order of sortedOrders) {
    if (!inventoryRemaining.has(order.sku)) {
      constraintViolations.push(
        `No inventory record found for SKU ${order.sku} — treated as zero usable stock.`
      );
    }
    const availableInventory = inventoryRemaining.get(order.sku) ?? 0;
    // A location with no lane on file is treated as unconstrained, so
    // datasets without last-mile data still plan.
    const availableLastMile = lastMileRemaining.get(order.location) ?? Infinity;

    const capacityLimit = order.requiredProcessingSteps.reduce(
      (min, taskId) =>
        Math.min(min, taskRemainingCapacity.get(taskId) ?? 0),
      Infinity
    );

    const fulfilledQuantity = Math.max(
      0,
      Math.min(order.quantity, availableInventory, capacityLimit, availableLastMile)
    );
    const shortfall = order.quantity - fulfilledQuantity;

    const limitingFactor: OrderFulfilment["limitingFactor"] =
      shortfall > 0
        ? pickLimitingFactor(capacityLimit, availableInventory, availableLastMile)
        : "none";

    inventoryRemaining.set(order.sku, availableInventory - fulfilledQuantity);
    if (lastMileRemaining.has(order.location)) {
      lastMileRemaining.set(order.location, availableLastMile - fulfilledQuantity);
    }
    for (const taskId of order.requiredProcessingSteps) {
      taskRemainingCapacity.set(
        taskId,
        (taskRemainingCapacity.get(taskId) ?? 0) - fulfilledQuantity
      );
    }

    orderFulfilment.push({
      orderId: order.id,
      requestedQuantity: order.quantity,
      fulfilledQuantity,
      shortfall,
      limitingFactor,
    });
  }

  for (const task of data.tasks) {
    const demand = taskDemandVolume(task.id, orders);
    const achievable =
      (internalAllocations.find((a) => a.taskId === task.id)?.resultingCapacity ?? 0) +
      (outsourcedByTaskId.get(task.id) ?? 0);
    if (achievable < demand) {
      constraintViolations.push(
        `${task.name}: ${demand - achievable} units of unmet demand even after ${managed ? "redeployment and outsourcing" : "staffing every own-skill worker"} (${demand} required, ${achievable} achievable).`
      );
    }
  }
  for (const lane of adjusted.lastMile) {
    const demand = orders
      .filter((o) => o.location === lane.location)
      .reduce((sum, o) => sum + o.quantity, 0);
    if (demand > lane.capacityPerDay) {
      constraintViolations.push(
        `Last mile from ${lane.location}: ${lane.carrier} can move ${lane.capacityPerDay} units/day against ${demand} pending.`
      );
    }
  }

  const totalExpectedFulfilment = orderFulfilment.reduce(
    (sum, f) => sum + f.fulfilledQuantity,
    0
  );
  const unfulfilledDemand = orderFulfilment.reduce(
    (sum, f) => sum + f.shortfall,
    0
  );
  const essentialIds = new Set(
    orders.filter((o) => o.essentiality === "essential").map((o) => o.id)
  );
  const essentialFulfilment = orderFulfilment.filter((f) => essentialIds.has(f.orderId));
  const ordersAtRisk = orderFulfilment
    .filter((f) => f.shortfall > 0)
    .map((f) => f.orderId);
  const incrementalCost = outsourcedVolumes.reduce(
    (sum, rec) => sum + rec.estimatedCost,
    0
  );

  return {
    dayIndex,
    orders,
    workforceRequirements,
    internalAllocations,
    redeployments,
    outsourcedVolumes,
    providerRequests,
    orderFulfilment,
    totalExpectedFulfilment,
    unfulfilledDemand,
    essentialUnitsRequested: essentialFulfilment.reduce((s, f) => s + f.requestedQuantity, 0),
    essentialUnitsFulfilled: essentialFulfilment.reduce((s, f) => s + f.fulfilledQuantity, 0),
    ordersAtRisk,
    incrementalCost,
    constraintViolations,
    // Derived from the deterministic `today` reference rather than the
    // real wall clock, so the engine stays a pure function of its inputs
    // (and safe to call during static prerendering).
    generatedAt: new Date(today).toISOString(),
  };
}
