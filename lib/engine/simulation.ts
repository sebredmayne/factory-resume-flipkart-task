import type { Scenario, ScenarioComparison } from "@/lib/types";
import type { BaseData } from "@/lib/engine/recovery";
import { generateRecoveryPlan } from "@/lib/engine/recovery";

export type ScenarioChanges = Partial<
  Pick<
    Scenario,
    | "name"
    | "workforceAvailability"
    | "providerCapacityOverrides"
    | "demandMultiplier"
    | "materialAvailabilityOverrides"
  >
>;

export interface SimulationResult {
  scenario: Scenario;
  comparison: ScenarioComparison;
}

// Function E — applies changes on top of a baseline scenario, reruns the
// recovery engine, and reports how the outcome moved relative to the
// baseline. Each override list is replaced wholesale when provided (the
// caller is expected to pass the full desired override set, e.g. the
// baseline's overrides plus the new change).
export function simulateScenario(
  baseline: Scenario,
  changes: ScenarioChanges,
  data: BaseData,
  today: string
): SimulationResult {
  const baselineResult =
    baseline.recoveryResult ?? generateRecoveryPlan(baseline, data, today);

  const scenario: Scenario = {
    id: `${baseline.id}-${Date.now()}`,
    name: changes.name ?? `${baseline.name} (modified)`,
    workforceAvailability:
      changes.workforceAvailability ?? baseline.workforceAvailability,
    providerCapacityOverrides:
      changes.providerCapacityOverrides ?? baseline.providerCapacityOverrides,
    demandMultiplier: changes.demandMultiplier ?? baseline.demandMultiplier,
    materialAvailabilityOverrides:
      changes.materialAvailabilityOverrides ??
      baseline.materialAvailabilityOverrides,
    recoveryResult: null,
  };

  const result = generateRecoveryPlan(scenario, data, today);
  scenario.recoveryResult = result;

  const comparison: ScenarioComparison = {
    fulfilmentDelta:
      result.totalExpectedFulfilment - baselineResult.totalExpectedFulfilment,
    costDelta: result.incrementalCost - baselineResult.incrementalCost,
    atRiskCountDelta:
      result.ordersAtRisk.length - baselineResult.ordersAtRisk.length,
    newlyAtRiskOrders: result.ordersAtRisk.filter(
      (id) => !baselineResult.ordersAtRisk.includes(id)
    ),
    recoveredOrders: baselineResult.ordersAtRisk.filter(
      (id) => !result.ordersAtRisk.includes(id)
    ),
  };

  return { scenario, comparison };
}
