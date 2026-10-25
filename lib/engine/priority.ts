import type { OrderGroup, Priority } from "@/lib/types";

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
