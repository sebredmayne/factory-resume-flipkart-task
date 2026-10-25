import type {
  Essentiality,
  OrderGroup,
  OrderInput,
  Priority,
  Product,
} from "@/lib/types";

const PRIORITY_WEIGHT: Record<Priority, number> = {
  critical: 4,
  high: 3,
  standard: 2,
  low: 1,
};

export function priorityWeight(priority: Priority): number {
  return PRIORITY_WEIGHT[priority];
}

export function daysUntil(dueAt: string, today: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = Date.parse(dueAt) - Date.parse(today);
  return Math.round(diff / msPerDay);
}

function describeDue(daysLeft: number): string {
  if (daysLeft < 0) return `${-daysLeft}d overdue`;
  if (daysLeft === 0) return "due today";
  return `due in ${daysLeft}d`;
}

const ESSENTIALITY_LABEL: Record<Essentiality, string> = {
  essential: "Essential",
  everyday: "Everyday",
  discretionary: "Discretionary",
};

// Priority comes from need first, then time. Essentials are never below
// high; everyday items only escalate when they're about to miss their date;
// discretionary items always yield. This replaces a hand-typed priority
// label, so the ranking is explainable ("Essential · due in 1d") and
// re-ranks itself as days pass.
export function derivePriority(
  essentiality: Essentiality,
  dueAt: string,
  today: string
): { priority: Priority; priorityReason: string } {
  const daysLeft = daysUntil(dueAt, today);
  const urgent = daysLeft <= 1;

  let priority: Priority;
  if (essentiality === "essential") priority = urgent ? "critical" : "high";
  else if (essentiality === "everyday") priority = urgent ? "high" : "standard";
  else priority = "low";

  return {
    priority,
    priorityReason: `${ESSENTIALITY_LABEL[essentiality]} · ${describeDue(daysLeft)}`,
  };
}

export function prioritiseOrders(
  inputs: OrderInput[],
  products: Product[],
  today: string
): OrderGroup[] {
  const essentialityBySku = new Map(
    products.map((p) => [p.sku, p.essentiality] as const)
  );
  return inputs.map((order) => {
    // Unknown SKUs are treated as everyday rather than silently dropped.
    const essentiality = essentialityBySku.get(order.sku) ?? "everyday";
    return {
      ...order,
      essentiality,
      ...derivePriority(essentiality, order.dueAt, today),
    };
  });
}

// Highest priority first, then soonest due date, then larger orders first.
// Used everywhere an order backlog needs a single, deterministic fulfilment
// order (capacity allocation, inventory consumption, risk reporting).
export function compareOrdersByUrgency(
  a: OrderGroup,
  b: OrderGroup
): number {
  const weightDiff = priorityWeight(b.priority) - priorityWeight(a.priority);
  if (weightDiff !== 0) return weightDiff;

  const dueDiff = Date.parse(a.dueAt) - Date.parse(b.dueAt);
  if (dueDiff !== 0) return dueDiff;

  return b.quantity - a.quantity;
}

// The "business as usual" order a floor falls back to without a plan:
// first due, first shipped, regardless of what's in the box.
export function compareOrdersByDueDate(a: OrderInput, b: OrderInput): number {
  const dueDiff = Date.parse(a.dueAt) - Date.parse(b.dueAt);
  if (dueDiff !== 0) return dueDiff;
  return a.id.localeCompare(b.id);
}
