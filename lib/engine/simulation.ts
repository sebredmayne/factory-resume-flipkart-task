import type { Scenario, ScenarioComparison } from "@/lib/types";
import type { BaseData } from "@/lib/engine/recovery";
import { projectOutlook, type Outlook } from "@/lib/engine/daily";

export type ScenarioChanges = Partial<
  Pick<
    Scenario,
    | "name"
    | "workforceAvailability"
    | "providerCapacityOverrides"
    | "materialAvailabilityOverrides"
    | "lastMileOverrides"
    | "demandShift"
    | "locationDemand"
  >
>;

export interface SimulationResult {
  scenario: Scenario;
  comparison: ScenarioComparison;
  baselineOutlook: Outlook;
  outlook: Outlook;
}

// Function E — applies changes on top of a baseline scenario, runs the
// daily loop forward over the outlook window for both, and reports how the
// outcome moved. Comparing outlooks rather than a single shift matters:
// demand shifts only show up as new orders arrive, and partners requested
// today only help tomorrow. Each override list is replaced wholesale when
// provided (the caller passes the full desired override set).
export function simulateScenario(
  baseline: Scenario,
  changes: ScenarioChanges,
  data: BaseData,
  today: string,
  days = 3
): SimulationResult {
  const baselineOutlook = projectOutlook(data, baseline, today, days);

  const scenario: Scenario = {
    id: `${baseline.id}+${changes.name ?? "modified"}`,
    name: changes.name ?? `${baseline.name} (modified)`,
    workforceAvailability:
      changes.workforceAvailability ?? baseline.workforceAvailability,
    providerCapacityOverrides:
      changes.providerCapacityOverrides ?? baseline.providerCapacityOverrides,
    materialAvailabilityOverrides:
      changes.materialAvailabilityOverrides ??
      baseline.materialAvailabilityOverrides,
    lastMileOverrides: changes.lastMileOverrides ?? baseline.lastMileOverrides,
    demandShift: changes.demandShift ?? baseline.demandShift,
    locationDemand: changes.locationDemand ?? baseline.locationDemand,
    recoveryResult: null,
  };

  const outlook = projectOutlook(data, scenario, today, days);
  scenario.recoveryResult = outlook.plans[0];

  const baseToday = baselineOutlook.plans[0];
  const scenarioToday = outlook.plans[0];
  const comparison: ScenarioComparison = {
    fulfilmentDelta: outlook.summary.shippedUnits - baselineOutlook.summary.shippedUnits,
    costDelta: outlook.summary.cost - baselineOutlook.summary.cost,
    atRiskCountDelta:
      scenarioToday.ordersAtRisk.length - baseToday.ordersAtRisk.length,
    essentialOnTimeDelta: Math.round(
      (outlook.summary.essentialOnTimeRate - baselineOutlook.summary.essentialOnTimeRate) * 100
    ),
    endBacklogDelta:
      outlook.summary.endBacklogUnits - baselineOutlook.summary.endBacklogUnits,
    newlyAtRiskOrders: scenarioToday.ordersAtRisk.filter(
      (id) => !baseToday.ordersAtRisk.includes(id)
    ),
    recoveredOrders: baseToday.ordersAtRisk.filter(
      (id) => !scenarioToday.ordersAtRisk.includes(id)
    ),
  };

  return { scenario, comparison, baselineOutlook, outlook };
}
