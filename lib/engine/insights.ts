import type { RecoveryPlan, Task } from "@/lib/types";

export interface BindingConstraint {
  kind: "capacity" | "inventory" | "last_mile" | "none";
  label: string;
}

// The one thing holding the day back: whichever limiting factor accounts
// for the most unshipped units, narrowed to the specific task, SKU or
// location. This is what the manager should spend tomorrow fixing.
export function bindingConstraint(plan: RecoveryPlan, tasks: Task[]): BindingConstraint {
  const orderById = new Map(plan.orders.map((o) => [o.id, o] as const));
  const byFactor = { capacity: 0, inventory: 0, last_mile: 0 };
  const bySku = new Map<string, number>();
  const byLocation = new Map<string, number>();

  for (const f of plan.orderFulfilment) {
    if (f.limitingFactor === "none") continue;
    byFactor[f.limitingFactor] += f.shortfall;
    const order = orderById.get(f.orderId)!;
    if (f.limitingFactor === "inventory") {
      bySku.set(order.sku, (bySku.get(order.sku) ?? 0) + f.shortfall);
    }
    if (f.limitingFactor === "last_mile") {
      byLocation.set(order.location, (byLocation.get(order.location) ?? 0) + f.shortfall);
    }
  }

  const top = (Object.entries(byFactor) as [BindingConstraint["kind"], number][])
    .sort((a, b) => b[1] - a[1])[0];
  if (!top || top[1] === 0) return { kind: "none", label: "None — the backlog clears" };

  const largest = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

  if (top[0] === "inventory") return { kind: "inventory", label: `Stock — ${largest(bySku)}` };
  if (top[0] === "last_mile") return { kind: "last_mile", label: `Last mile — ${largest(byLocation)}` };

  // Capacity: the core-line task with the least achievable volume.
  const outsourced = new Map<string, number>();
  for (const r of plan.outsourcedVolumes) {
    outsourced.set(r.taskId, (outsourced.get(r.taskId) ?? 0) + r.recommendedVolume);
  }
  const coreTasks = tasks.filter((t) =>
    plan.orders.every((o) => o.requiredProcessingSteps.includes(t.id))
  );
  const weakest = coreTasks
    .map((t) => ({
      task: t,
      achievable:
        (plan.internalAllocations.find((a) => a.taskId === t.id)?.resultingCapacity ?? 0) +
        (outsourced.get(t.id) ?? 0),
    }))
    .sort((a, b) => a.achievable - b.achievable)[0];
  return { kind: "capacity", label: weakest ? `${weakest.task.name} capacity` : "Capacity" };
}
