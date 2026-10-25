import { describe, expect, it } from "vitest";
import { evaluateOutsourcing, providerActiveFraction } from "@/lib/engine/outsourcing";
import type { WorkforceAllocation } from "@/lib/types";
import { makeOrder, makeProvider, makeTask } from "./helpers";

const task = makeTask({ id: "packing", requiredSkill: "packing", labourHoursPerUnit: 0.08, maxThroughput: 3000 });

const order = makeOrder({
  id: "o1",
  sku: "SKU-A",
  quantity: 1000,
  priority: "critical",
  dueAt: "2026-10-27",
  location: "Bengaluru FC",
  requiredProcessingSteps: ["packing"],
});

const allocation: WorkforceAllocation = {
  taskId: "packing",
  allocatedWorkers: 5,
  redeployedInWorkers: 0,
  unfilledWorkers: 0,
  resultingCapacity: 200, // leaves an 800-unit shortfall vs the 1000 demanded
};

// Providers requested yesterday are fully live today, so these tests isolate
// matching and capacity logic from activation timing.
const live = (...ids: string[]) => ({
  providerRequestDay: Object.fromEntries(ids.map((id) => [id, -1])),
});

describe("evaluateOutsourcing — matching and capacity", () => {
  it("never recommends more volume than a provider's confirmed capacity", () => {
    const small = makeProvider({ id: "small", availableCapacity: 300 });

    const { recommendations } = evaluateOutsourcing([task], [order], [allocation], [small], "2026-10-25", live("small"));

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].recommendedVolume).toBe(300);
  });

  it("splits a shortfall across providers, cheapest first, without exceeding the gap", () => {
    const cheap = makeProvider({ id: "cheap", availableCapacity: 400, costPerUnit: 4 });
    const expensive = makeProvider({ id: "expensive", availableCapacity: 1000, costPerUnit: 9 });

    const { recommendations } = evaluateOutsourcing(
      [task], [order], [allocation], [expensive, cheap], "2026-10-25", live("cheap", "expensive")
    );

    expect(recommendations.reduce((s, r) => s + r.recommendedVolume, 0)).toBe(800);
    expect(recommendations[0]).toMatchObject({ providerId: "cheap", recommendedVolume: 400 });
    expect(recommendations[1]).toMatchObject({ providerId: "expensive", recommendedVolume: 400 });
  });

  it("ignores providers that don't service the task or cover the order's location", () => {
    const wrongService = makeProvider({ id: "wrong-service", services: ["picking"] });
    const wrongLocation = makeProvider({ id: "wrong-location", supportedLocations: ["Somewhere Else"] });

    const { recommendations } = evaluateOutsourcing(
      [task], [order], [allocation], [wrongService, wrongLocation], "2026-10-25", live("wrong-service", "wrong-location")
    );

    expect(recommendations).toHaveLength(0);
  });

  it("produces no recommendation when internal capacity already meets demand", () => {
    const full: WorkforceAllocation = { ...allocation, resultingCapacity: 1000 };
    const { recommendations } = evaluateOutsourcing([task], [order], [full], [makeProvider({ id: "p1" })], "2026-10-25");
    expect(recommendations).toHaveLength(0);
  });
});

describe("evaluateOutsourcing — activation timing", () => {
  it("prorates the first day by activation lead time", () => {
    expect(providerActiveFraction(makeProvider({ id: "a", activationHours: 6 }), 0, 0)).toBe(0.75);
    expect(providerActiveFraction(makeProvider({ id: "b", activationHours: 24 }), 0, 0)).toBe(0);
    expect(providerActiveFraction(makeProvider({ id: "b", activationHours: 24 }), 1, 0)).toBe(1);
    expect(providerActiveFraction(makeProvider({ id: "c", activationHours: 48 }), 1, 0)).toBe(0);
  });

  it("uses only today's live share of a partner, and advises requesting slow partners now", () => {
    const halfDay = makeProvider({ id: "half", activationHours: 12, availableCapacity: 1000 });
    const nextDay = makeProvider({ id: "next", activationHours: 24, costPerUnit: 1 });

    const { recommendations, requestAdvice } = evaluateOutsourcing(
      [task], [order], [allocation], [halfDay, nextDay], "2026-10-25"
    );

    expect(recommendations).toEqual([
      expect.objectContaining({ providerId: "half", recommendedVolume: 500, availableFraction: 0.5 }),
    ]);
    expect(requestAdvice).toEqual([
      expect.objectContaining({ providerId: "next", taskId: "packing", availableFromDay: 1 }),
    ]);
  });
});

describe("evaluateOutsourcing — buys only what the line can ship", () => {
  it("caps outsourced picking at what packing can process downstream", () => {
    const picking = makeTask({ id: "picking" });
    const packing = makeTask({ id: "packing", requiredSkill: "packing", outsourcingEligible: false });
    const lineOrder = makeOrder({ id: "o1", quantity: 1000, location: "Bengaluru FC", requiredProcessingSteps: ["picking", "packing"] });
    const allocations: WorkforceAllocation[] = [
      { taskId: "picking", allocatedWorkers: 1, redeployedInWorkers: 0, unfilledWorkers: 0, resultingCapacity: 200 },
      { taskId: "packing", allocatedWorkers: 1, redeployedInWorkers: 0, unfilledWorkers: 0, resultingCapacity: 500 },
    ];
    const pickPartner = makeProvider({ id: "pick", services: ["picking"], availableCapacity: 2000 });

    const { recommendations } = evaluateOutsourcing(
      [picking, packing], [lineOrder], allocations, [pickPartner], "2026-10-25", live("pick")
    );

    // Packing can only process 500 and can't be outsourced, so buying more
    // than 300 units of picking (to reach 500) would be waste.
    expect(recommendations[0].recommendedVolume).toBe(300);
  });
});
