import { describe, expect, it } from "vitest";
import { generateRecoveryPlan, simulateScenario } from "@/lib/engine";
import type { BaseData } from "@/lib/engine/recovery";
import {
  orders,
  workforce,
  tasks,
  inventory,
  providers,
  baselineScenario,
  SCENARIO_TODAY,
} from "@/lib/data";

const data: BaseData = { orders, tasks, workforce, inventory, providers };

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
    const totalOrdered = orders.reduce((sum, o) => sum + o.quantity, 0);

    const wipeoutScenario = {
      id: "wipeout",
      name: "Total wipeout",
      workforceAvailability: workforce.map((g) => ({
        skill: g.skill,
        availableWorkers: 0,
      })),
      providerCapacityOverrides: providers.map((p) => ({
        providerId: p.id,
        availableCapacity: 0,
      })),
      demandMultiplier: 1,
      materialAvailabilityOverrides: inventory.map((i) => ({
        sku: i.sku,
        availableQuantity: 0,
      })),
      recoveryResult: null,
    };

    const plan = generateRecoveryPlan(wipeoutScenario, data, SCENARIO_TODAY);

    expect(hasNaNOrInfinity(plan)).toBe(false);
    expect(plan.totalExpectedFulfilment).toBe(0);
    expect(plan.unfulfilledDemand).toBe(totalOrdered);
    expect(plan.ordersAtRisk).toHaveLength(orders.length);
    expect(plan.incrementalCost).toBe(0); // no provider capacity to spend on
    expect(plan.constraintViolations.length).toBeGreaterThan(0);

    for (const allocation of plan.internalAllocations) {
      expect(allocation.allocatedWorkers).toBe(0);
      expect(allocation.resultingCapacity).toBe(0);
    }
    for (const f of plan.orderFulfilment) {
      expect(f.fulfilledQuantity).toBe(0);
      expect(f.shortfall).toBe(f.requestedQuantity);
      expect(f.shortfall).toBeGreaterThanOrEqual(0);
    }
  });

  it("handles the most extreme combination of scenario sliders without crashing", () => {
    const { scenario, comparison } = simulateScenario(
      baselineScenario,
      {
        name: "Worst case",
        workforceAvailability: workforce.map((g) => ({
          skill: g.skill,
          availableWorkers: Math.round(g.availableWorkers * 0.2), // 80% loss
        })),
        providerCapacityOverrides: providers.map((p) => ({
          providerId: p.id,
          availableCapacity: 0, // 100% outage, every provider
        })),
        demandMultiplier: 1.5, // +50% demand
        materialAvailabilityOverrides: inventory.map((i) => ({
          sku: i.sku,
          availableQuantity: Math.round(i.availableQuantity * 0.1), // 90% stock loss
        })),
      },
      data,
      SCENARIO_TODAY
    );

    expect(hasNaNOrInfinity(scenario.recoveryResult)).toBe(false);
    expect(hasNaNOrInfinity(comparison)).toBe(false);
    expect(scenario.recoveryResult!.totalExpectedFulfilment).toBeGreaterThanOrEqual(0);
    expect(comparison.fulfilmentDelta).toBeLessThanOrEqual(0);
  });
});
