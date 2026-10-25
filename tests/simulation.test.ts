import { describe, expect, it } from "vitest";
import { simulateScenario } from "@/lib/engine/simulation";
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

describe("simulateScenario", () => {
  it("shows a worse outcome when the surviving workforce shrinks further", () => {
    const data: BaseData = { orders, tasks, workforce, inventory, providers };

    const halvedWorkforce = workforce.map((group) => ({
      skill: group.skill,
      availableWorkers: Math.floor(group.availableWorkers * 0.5),
    }));

    const { scenario, comparison } = simulateScenario(
      baselineScenario,
      {
        name: "Additional 50% workforce loss",
        workforceAvailability: halvedWorkforce,
      },
      data,
      SCENARIO_TODAY
    );

    expect(scenario.recoveryResult).not.toBeNull();
    expect(comparison.fulfilmentDelta).toBeLessThanOrEqual(0);
    expect(comparison.costDelta).toBeGreaterThanOrEqual(0);
    expect(comparison.atRiskCountDelta).toBeGreaterThanOrEqual(0);
  });

  it("recovers orders when a provider's capacity increases", () => {
    const data: BaseData = { orders, tasks, workforce, inventory, providers };

    const boostedProviders = providers.map((p) => ({
      providerId: p.id,
      availableCapacity: p.availableCapacity * 10,
    }));

    const { comparison } = simulateScenario(
      baselineScenario,
      {
        name: "Providers scale up 10x",
        providerCapacityOverrides: boostedProviders,
      },
      data,
      SCENARIO_TODAY
    );

    expect(comparison.fulfilmentDelta).toBeGreaterThanOrEqual(0);
  });
});
