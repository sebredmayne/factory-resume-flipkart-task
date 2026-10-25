import type {
  ExternalProvider,
  OrderGroup,
  OutsourcingRecommendation,
  Task,
  WorkforceAllocation,
} from "@/lib/types";
import { taskDemandVolume } from "@/lib/engine/workforce";
import { compareOrdersByUrgency, daysUntil } from "@/lib/engine/priority";

function eligibleProviders(
  task: Task,
  orderLocations: string[],
  providers: ExternalProvider[]
): ExternalProvider[] {
  return providers.filter(
    (provider) =>
      provider.services.includes(task.id) &&
      provider.supportedLocations.some((loc) => orderLocations.includes(loc))
  );
}

// Orders requiring this task, most urgent first, annotated with the
// cumulative volume reached once this order is included — used to decide
// which orders a slice of outsourced capacity actually rescues.
function ordersWithCumulativeVolume(task: Task, orders: OrderGroup[]) {
  const relevant = orders
    .filter((order) => order.requiredProcessingSteps.includes(task.id))
    .sort(compareOrdersByUrgency);

  let running = 0;
  return relevant.map((order) => {
    running += order.quantity;
    return { order, cumulativeTo: running };
  });
}

// Function C — for each task short of internal capacity, find external
// providers that can cover the gap, respecting their confirmed capacity
// (never assumed unlimited) and reporting why each one was chosen.
export function evaluateOutsourcing(
  tasks: Task[],
  orders: OrderGroup[],
  allocations: WorkforceAllocation[],
  providers: ExternalProvider[],
  today: string
): OutsourcingRecommendation[] {
  const allocationByTaskId = new Map(
    allocations.map((a) => [a.taskId, a] as const)
  );
  const recommendations: OutsourcingRecommendation[] = [];

  for (const task of tasks) {
    if (!task.outsourcingEligible) continue;

    const demandVolume = taskDemandVolume(task.id, orders);
    const internalCapacity = allocationByTaskId.get(task.id)?.resultingCapacity ?? 0;
    const shortfall = Math.max(0, demandVolume - internalCapacity);
    if (shortfall === 0) continue;

    const ordersForTask = ordersWithCumulativeVolume(task, orders);
    const orderLocations = [
      ...new Set(ordersForTask.map((o) => o.order.location)),
    ];
    const earliestDueAt = ordersForTask[0]?.order.dueAt;
    const hoursUntilDue = earliestDueAt
      ? daysUntil(earliestDueAt, today) * 24
      : Infinity;

    const candidates = eligibleProviders(task, orderLocations, providers).sort(
      (a, b) => a.costPerUnit - b.costPerUnit
    );

    let remainingShortfall = shortfall;
    let coveredSoFar = internalCapacity;

    for (const provider of candidates) {
      if (remainingShortfall <= 0) break;

      const assignedVolume = Math.min(
        remainingShortfall,
        provider.availableCapacity
      );
      if (assignedVolume <= 0) continue;

      const windowStart = coveredSoFar;
      const windowEnd = coveredSoFar + assignedVolume;
      const ordersRecovered = ordersForTask
        .filter(
          (o) =>
            o.cumulativeTo > windowStart &&
            o.cumulativeTo - o.order.quantity < windowEnd
        )
        .map((o) => o.order.id);

      const risks: string[] = [];
      if (provider.qualityRequirements) {
        risks.push(provider.qualityRequirements);
      }
      if (provider.activationHours > hoursUntilDue) {
        risks.push(
          `Activation takes ${provider.activationHours}h, longer than the ${Math.max(
            hoursUntilDue,
            0
          )}h available before the earliest affected order is due.`
        );
      }
      if (assignedVolume < remainingShortfall) {
        risks.push(
          `Covers only ${assignedVolume} of the ${remainingShortfall} unit gap remaining at this provider's confirmed capacity.`
        );
      }

      recommendations.push({
        taskId: task.id,
        providerId: provider.id,
        recommendedVolume: assignedVolume,
        estimatedCost: assignedVolume * provider.costPerUnit,
        expectedAdditionalThroughput: assignedVolume,
        ordersRecovered,
        rationale: `${task.name} needs ${demandVolume} units but internal capacity covers only ${internalCapacity} (a ${shortfall}-unit gap). ${provider.name} is the lowest-cost eligible provider at ${provider.costPerUnit}/unit for this lane. Overtime and internal reallocation were not modeled as alternatives in this version.`,
        risks,
      });

      coveredSoFar += assignedVolume;
      remainingShortfall -= assignedVolume;
    }
  }

  return recommendations;
}
