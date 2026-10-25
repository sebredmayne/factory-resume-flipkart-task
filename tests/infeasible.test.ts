import { describe, expect, it } from "vitest";
import { generateRecoveryPlan, simulateScenario } from "@/lib/engine";
import { baseData, baselineScenario, inventory, lastMile, providers, workforce, SCENARIO_TODAY } from "@/lib/data";

function hasNaNOrInfinity(value: unknown): boolean {
  if (typeof value === "number") return !Number.isFinite(value);
  if (Array.isArray(value)) return value.some(hasNaNOrInfinity);
  if (value && typeof value === "object") {
    return Object.values(value).some(hasNaNOrInfinity);
  }
  return false;
}

describe("generateRecoveryPlan — totally infeasible scenario", () => {
  it("degrades to zero fulfilment without producing NaN, Infinity, or negative numbers", () => {
    const totalOrdered = baseData.orders.reduce((sum, o) => sum + o.quantity, 0);

    const plan = generateRecoveryPlan(
      {
        ...baselineScenario,
        id: "wipeout",
        name: "Total wipeout",
        workforceAvailability: workforce.map((g) => ({ groupId: g.id, availableWorkers: 0 })),
        providerCapacityOverrides: providers.map((p) => ({ providerId: p.id, availableCapacity: 0 })),
        materialAvailabilityOverrides: inventory.map((i) => ({ sku: i.sku, availableQuantity: 0 })),
        lastMileOverrides: lastMile.map((l) => ({ location: l.location, capacityPerDay: 0 })),
      },
      baseData,
      SCENARIO_TODAY
    );

    expect(hasNaNOrInfinity(plan)).toBe(false);
    expect(plan.totalExpectedFulfilment).toBe(0);
    expect(plan.unfulfilledDemand).toBe(totalOrdered);
    expect(plan.ordersAtRisk).toHaveLength(baseData.orders.length);
    expect(plan.incrementalCost).toBe(0);
    expect(plan.redeployments).toHaveLength(0);
    expect(plan.constraintViolations.length).toBeGreaterThan(0);
    for (const f of plan.orderFulfilment) {
      expect(f.fulfilledQuantity).toBe(0);
      expect(f.shortfall).toBe(f.requestedQuantity);
    }
  });

  it("handles the most extreme combination of scenario sliders without crashing", () => {
    const { scenario, comparison, outlook } = simulateScenario(
      baselineScenario,
      {
        name: "Worst case",
        workforceAvailability: workforce.map((g) => ({
          groupId: g.id,
          availableWorkers: Math.round(g.availableWorkers * 0.2),
        })),
        providerCapacityOverrides: providers.map((p) => ({ providerId: p.id, availableCapacity: 0 })),
        materialAvailabilityOverrides: inventory.map((i) => ({
          sku: i.sku,
          availableQuantity: Math.round(i.availableQuantity * 0.1),
        })),
        lastMileOverrides: lastMile.map((l) => ({ location: l.location, capacityPerDay: 0 })),
        demandShift: { essential: 2, everyday: 1, discretionary: 1 },
      },
      baseData,
      SCENARIO_TODAY
    );

    expect(hasNaNOrInfinity(scenario.recoveryResult)).toBe(false);
    expect(hasNaNOrInfinity(comparison)).toBe(false);
    expect(hasNaNOrInfinity(outlook.summary)).toBe(false);
    expect(comparison.fulfilmentDelta).toBeLessThanOrEqual(0);
  });
});
