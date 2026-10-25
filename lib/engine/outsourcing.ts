import type {
  ExternalProvider,
  OrderGroup,
  OutsourcingRecommendation,
  ProviderRequestAdvice,
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

// Share of a provider's daily capacity usable on `dayIndex`, given the day
// it was requested. Lead time eats into the first day: a 6h partner
// requested this morning delivers 75% of a day, a 24h partner nothing until
// tomorrow, a 48h partner nothing until the day after.
export function providerActiveFraction(
  provider: ExternalProvider,
  dayIndex: number,
  requestedOnDay: number
): number {
  const hoursLiveByEndOfDay =
    (dayIndex - requestedOnDay) * 24 + 24 - provider.activationHours;
  return Math.min(1, Math.max(0, hoursLiveByEndOfDay / 24));
}

export function providerFullFromDay(
  provider: ExternalProvider,
  requestedOnDay: number
): number {
  return requestedOnDay + Math.ceil(provider.activationHours / 24);
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

export const MIN_ENGAGEMENT_UNITS = 100;

export interface OutsourcingOptions {
  dayIndex?: number;
  // Day each provider was requested on. Providers not listed are assumed to
  // be requested today, which is what the recommendation asks for.
  providerRequestDay?: Record<string, number>;
}

export interface OutsourcingResult {
  recommendations: OutsourcingRecommendation[];
  requestAdvice: ProviderRequestAdvice[];
}

// Function C — for each task short of internal capacity (after
// redeployment), find external providers that can cover the gap.
//
// Two guardrails keep spend honest:
// - Capacity is the provider's confirmed capacity times the share of today
//   it's actually live, never assumed unlimited or instant.
// - Volume is only bought up to what the line can ship. Every order passes
//   through the core steps, so buying picking capacity beyond what
//   packing and quality inspection can process is waste.
export function evaluateOutsourcing(
  tasks: Task[],
  orders: OrderGroup[],
  allocations: WorkforceAllocation[],
  providers: ExternalProvider[],
  today: string,
  options: OutsourcingOptions = {}
): OutsourcingResult {
  const { dayIndex = 0, providerRequestDay = {} } = options;
  const requestDayOf = (p: ExternalProvider) => providerRequestDay[p.id] ?? dayIndex;

  const allocationByTaskId = new Map(
    allocations.map((a) => [a.taskId, a] as const)
  );
  const orderLocationsFor = (task: Task) => [
    ...new Set(
      orders
        .filter((o) => o.requiredProcessingSteps.includes(task.id))
        .map((o) => o.location)
    ),
  ];
  const activeCapacity = (p: ExternalProvider) =>
    Math.floor(p.availableCapacity * providerActiveFraction(p, dayIndex, requestDayOf(p)));

  // How far the line can get today if every live partner is used: the
  // weakest core step caps what's worth buying anywhere else.
  const coreTasks = tasks.filter(
    (t) =>
      orders.length > 0 &&
      orders.every((o) => o.requiredProcessingSteps.includes(t.id))
  );
  let lineCoverage = 1;
  for (const task of coreTasks) {
    const demand = taskDemandVolume(task.id, orders);
    if (demand <= 0) continue;
    const internal = allocationByTaskId.get(task.id)?.resultingCapacity ?? 0;
    const external = task.outsourcingEligible
      ? eligibleProviders(task, orderLocationsFor(task), providers).reduce(
          (sum, p) => sum + activeCapacity(p),
          0
        )
      : 0;
    lineCoverage = Math.min(lineCoverage, (internal + external) / demand);
  }

  const recommendations: OutsourcingRecommendation[] = [];
  const requestAdvice: ProviderRequestAdvice[] = [];

  for (const task of tasks) {
    if (!task.outsourcingEligible) continue;

    const demandVolume = taskDemandVolume(task.id, orders);
    const internalCapacity = allocationByTaskId.get(task.id)?.resultingCapacity ?? 0;
    const fullShortfall = Math.max(0, demandVolume - internalCapacity);
    if (fullShortfall === 0) continue;

    const usefulVolume = coreTasks.includes(task)
      ? Math.ceil(lineCoverage * demandVolume)
      : demandVolume;
    const shortfall = Math.max(0, usefulVolume - internalCapacity);

    const ordersForTask = ordersWithCumulativeVolume(task, orders);
    const orderLocations = orderLocationsFor(task);
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
      const fraction = providerActiveFraction(provider, dayIndex, requestDayOf(provider));
      const usableToday = activeCapacity(provider);

      if (usableToday <= 0) {
        if (providerRequestDay[provider.id] === undefined) {
          requestAdvice.push({
            providerId: provider.id,
            taskId: task.id,
            availableFromDay: providerFullFromDay(provider, dayIndex),
            reason: `${task.name} is ${fullShortfall} units short even after redeployment. ${provider.name} needs ${provider.activationHours}h to activate, so it can't help today — request it now to have up to ${provider.availableCapacity} units/day from Day ${providerFullFromDay(provider, dayIndex) + 1}.`,
          });
        }
        continue;
      }
      if (remainingShortfall <= 0) continue;

      const assignedVolume = Math.min(remainingShortfall, usableToday);
      // Partners won't activate a lane for a token volume, and onboarding
      // one isn't free for the manager either.
      if (assignedVolume < MIN_ENGAGEMENT_UNITS) continue;

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
      if (fraction < 1) {
        risks.push(
          `Live for only ${Math.round(fraction * 24)}h of today after its ${provider.activationHours}h activation — ${usableToday} of ${provider.availableCapacity} units/day usable.`
        );
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
          `Covers only ${assignedVolume} of the ${remainingShortfall} unit gap remaining at this provider's usable capacity.`
        );
      }

      const lineCapNote =
        usefulVolume < demandVolume
          ? ` Volume is capped at ${usefulVolume} units — what the rest of the line can ship today — rather than the full ${demandVolume}.`
          : "";

      recommendations.push({
        taskId: task.id,
        providerId: provider.id,
        recommendedVolume: assignedVolume,
        estimatedCost: assignedVolume * provider.costPerUnit,
        expectedAdditionalThroughput: assignedVolume,
        availableFraction: fraction,
        ordersRecovered,
        rationale: `${task.name} needs ${demandVolume} units; internal capacity after redeployment covers ${internalCapacity}. ${provider.name} is the lowest-cost eligible provider live today, at ${provider.costPerUnit}/unit.${lineCapNote}`,
        risks,
      });

      coveredSoFar += assignedVolume;
      remainingShortfall -= assignedVolume;
    }
  }

  return { recommendations, requestAdvice };
}
