import type {
  ExternalProvider,
  InventoryItem,
  OrderFulfilment,
  OrderGroup,
  RecoveryPlan,
  Scenario,
  Task,
  WorkforceGroup,
} from "@/lib/types";
import { calculateWorkforceRequirements, taskDemandVolume } from "@/lib/engine/workforce";
import { allocateWorkforce } from "@/lib/engine/allocation";
import { evaluateOutsourcing } from "@/lib/engine/outsourcing";
import { compareOrdersByUrgency } from "@/lib/engine/priority";

export interface BaseData {
  orders: OrderGroup[];
  tasks: Task[];
  workforce: WorkforceGroup[];
  inventory: InventoryItem[];
  providers: ExternalProvider[];
}

interface AdjustedData {
  orders: OrderGroup[];
  workforce: WorkforceGroup[];
  inventory: InventoryItem[];
  providers: ExternalProvider[];
}

// Applies a scenario's overrides on top of the base operational data.
// Overrides replace a single entity's value; anything not named in the
// scenario is left untouched.
export function applyScenario(data: BaseData, scenario: Scenario): AdjustedData {
  const workforce = data.workforce.map((group) => {
    const override = scenario.workforceAvailability.find(
      (o) => o.skill === group.skill
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

  const orders = data.orders.map((order) => ({
    ...order,
    quantity: Math.round(order.quantity * scenario.demandMultiplier),
  }));

  return { orders, workforce, inventory, providers };
}

// Function D — orchestrates A, B and C, then resolves per-order fulfilment
// against both task capacity (internal + outsourced) and usable inventory,
// processing the backlog in priority order so higher-priority orders claim
// scarce capacity and stock first.
export function generateRecoveryPlan(
  scenario: Scenario,
  data: BaseData,
  today: string
): RecoveryPlan {
  const adjusted = applyScenario(data, scenario);

  const workforceRequirements = calculateWorkforceRequirements(
    adjusted.orders,
    data.tasks,
    adjusted.workforce
  );
  const internalAllocations = allocateWorkforce(
    workforceRequirements,
    data.tasks,
    adjusted.workforce,
    adjusted.orders
  );
  const outsourcedVolumes = evaluateOutsourcing(
    data.tasks,
    adjusted.orders,
    internalAllocations,
    adjusted.providers,
    today
  );

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

  const constraintViolations: string[] = [];
  const orderFulfilment: OrderFulfilment[] = [];
  const sortedOrders = [...adjusted.orders].sort(compareOrdersByUrgency);

  for (const order of sortedOrders) {
    const hasInventoryRecord = inventoryRemaining.has(order.sku);
    if (!hasInventoryRecord) {
      constraintViolations.push(
        `No inventory record found for SKU ${order.sku} — treated as zero usable stock.`
      );
    }
    const availableInventory = inventoryRemaining.get(order.sku) ?? 0;

    const capacityLimit = order.requiredProcessingSteps.reduce(
      (min, taskId) =>
        Math.min(min, taskRemainingCapacity.get(taskId) ?? 0),
      Infinity
    );

    const fulfilledQuantity = Math.max(
      0,
      Math.min(order.quantity, availableInventory, capacityLimit)
    );
    const shortfall = order.quantity - fulfilledQuantity;

    let limitingFactor: OrderFulfilment["limitingFactor"] = "none";
    if (shortfall > 0) {
      limitingFactor =
        capacityLimit <= availableInventory ? "capacity" : "inventory";
    }

    inventoryRemaining.set(order.sku, availableInventory - fulfilledQuantity);
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
    const demand = taskDemandVolume(task.id, adjusted.orders);
    const achievable =
      (internalAllocations.find((a) => a.taskId === task.id)?.resultingCapacity ?? 0) +
      (outsourcedByTaskId.get(task.id) ?? 0);
    if (achievable < demand) {
      constraintViolations.push(
        `${task.name}: ${demand - achievable} units of unmet demand even after outsourcing (${demand} required, ${achievable} achievable).`
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
  const ordersAtRisk = orderFulfilment
    .filter((f) => f.shortfall > 0)
    .map((f) => f.orderId);
  const incrementalCost = outsourcedVolumes.reduce(
    (sum, rec) => sum + rec.estimatedCost,
    0
  );

  return {
    workforceRequirements,
    internalAllocations,
    outsourcedVolumes,
    orderFulfilment,
    totalExpectedFulfilment,
    unfulfilledDemand,
    ordersAtRisk,
    incrementalCost,
    constraintViolations,
    // Derived from the deterministic `today` reference rather than the
    // real wall clock, so the engine stays a pure function of its inputs
    // (and safe to call during static prerendering).
    generatedAt: new Date(today).toISOString(),
  };
}
