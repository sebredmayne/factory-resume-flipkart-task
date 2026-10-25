import { describe, expect, it } from "vitest";
import { simulateScenario } from "@/lib/engine/simulation";
import { baseData, baselineScenario, providers, workforce, SCENARIO_TODAY } from "@/lib/data";

describe("simulateScenario", () => {
  it("shows a worse outlook when the surviving workforce shrinks further", () => {
    const { scenario, comparison } = simulateScenario(
      baselineScenario,
      {
        name: "Additional 50% workforce loss",
        workforceAvailability: workforce.map((g) => ({
          groupId: g.id,
          availableWorkers: Math.floor(g.availableWorkers * 0.5),
        })),
      },
      baseData,
      SCENARIO_TODAY
    );

    expect(scenario.recoveryResult).not.toBeNull();
    expect(comparison.fulfilmentDelta).toBeLessThan(0);
    expect(comparison.endBacklogDelta).toBeGreaterThan(0);
  });

  it("recovers volume when providers' capacity increases", () => {
    const { comparison } = simulateScenario(
      baselineScenario,
      {
        name: "Providers scale up 10x",
        providerCapacityOverrides: providers.map((p) => ({
          providerId: p.id,
          availableCapacity: p.availableCapacity * 10,
        })),
      },
      baseData,
      SCENARIO_TODAY
    );

    expect(comparison.fulfilmentDelta).toBeGreaterThanOrEqual(0);
  });

  it("feeds demand shift into the outlook through new orders, not today's backlog", () => {
    const { comparison, outlook, baselineOutlook } = simulateScenario(
      baselineScenario,
      { name: "Essentials surge", demandShift: { essential: 1.8, everyday: 0.5, discretionary: 0.2 } },
      baseData,
      SCENARIO_TODAY
    );

    // Day 1 plans the same backlog either way…
    expect(outlook.plans[0].totalExpectedFulfilment).toBe(baselineOutlook.plans[0].totalExpectedFulfilment);
    // …but the surge piles up behind it.
    expect(comparison.endBacklogDelta).toBeGreaterThan(0);
  });
});
