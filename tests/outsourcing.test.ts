import { describe, expect, it } from "vitest";
import { evaluateOutsourcing } from "@/lib/engine/outsourcing";
import type { ExternalProvider, OrderGroup, Task, WorkforceAllocation } from "@/lib/types";

const task: Task = {
  id: "packing",
  name: "Packing & Labelling",
  labourHoursPerUnit: 0.08,
  requiredSkill: "packing",
  maxThroughput: 3000,
  prerequisites: [],
  outsourcingEligible: true,
};

const order: OrderGroup = {
  id: "o1",
  sku: "SKU-A",
  quantity: 1000,
  priority: "critical",
  dueAt: "2026-10-27",
  location: "Bengaluru FC",
  requiredProcessingSteps: ["packing"],
  unitValue: 100,
};

const allocation: WorkforceAllocation = {
  taskId: "packing",
  allocatedWorkers: 5,
  unfilledWorkers: 0,
  resultingCapacity: 200, // leaves an 800-unit shortfall vs the 1000 demanded
};

describe("evaluateOutsourcing", () => {
  it("never recommends more volume than a provider's confirmed capacity", () => {
    const smallProvider: ExternalProvider = {
      id: "small",
      name: "Small Co-pack",
      services: ["packing"],
      availableCapacity: 300,
      costPerUnit: 5,
      activationHours: 12,
      supportedLocations: ["Bengaluru FC"],
      qualityRequirements: null,
    };

    const recs = evaluateOutsourcing(
      [task],
      [order],
      [allocation],
      [smallProvider],
      "2026-10-25"
    );

    expect(recs).toHaveLength(1);
    expect(recs[0].recommendedVolume).toBeLessThanOrEqual(smallProvider.availableCapacity);
    expect(recs[0].recommendedVolume).toBe(300);
  });

  it("splits a shortfall across multiple eligible providers, cheapest first, without exceeding total confirmed capacity", () => {
    const cheap: ExternalProvider = {
      id: "cheap",
      name: "Cheap Partner",
      services: ["packing"],
      availableCapacity: 400,
      costPerUnit: 4,
      activationHours: 12,
      supportedLocations: ["Bengaluru FC"],
      qualityRequirements: null,
    };
    const expensive: ExternalProvider = {
      id: "expensive",
      name: "Expensive Partner",
      services: ["packing"],
      availableCapacity: 1000,
      costPerUnit: 9,
      activationHours: 12,
      supportedLocations: ["Bengaluru FC"],
      qualityRequirements: null,
    };

    const recs = evaluateOutsourcing(
      [task],
      [order],
      [allocation],
      [expensive, cheap],
      "2026-10-25"
    );

    const totalAssigned = recs.reduce((sum, r) => sum + r.recommendedVolume, 0);
    expect(totalAssigned).toBe(800); // exactly the shortfall, no more
    expect(recs[0].providerId).toBe("cheap"); // cheapest used first
    expect(recs[0].recommendedVolume).toBe(400);
    expect(recs[1].providerId).toBe("expensive");
    expect(recs[1].recommendedVolume).toBe(400);
  });

  it("ignores providers that don't service the task or cover the order's location", () => {
    const wrongService: ExternalProvider = {
      id: "wrong-service",
      name: "Picking Only Partner",
      services: ["picking"],
      availableCapacity: 1000,
      costPerUnit: 1,
      activationHours: 1,
      supportedLocations: ["Bengaluru FC"],
      qualityRequirements: null,
    };
    const wrongLocation: ExternalProvider = {
      id: "wrong-location",
      name: "Remote Partner",
      services: ["packing"],
      availableCapacity: 1000,
      costPerUnit: 1,
      activationHours: 1,
      supportedLocations: ["Somewhere Else"],
      qualityRequirements: null,
    };

    const recs = evaluateOutsourcing(
      [task],
      [order],
      [allocation],
      [wrongService, wrongLocation],
      "2026-10-25"
    );

    expect(recs).toHaveLength(0);
  });

  it("produces no recommendation when internal capacity already meets demand", () => {
    const fullAllocation: WorkforceAllocation = {
      taskId: "packing",
      allocatedWorkers: 20,
      unfilledWorkers: 0,
      resultingCapacity: 1000,
    };
    const provider: ExternalProvider = {
      id: "p1",
      name: "Any Partner",
      services: ["packing"],
      availableCapacity: 500,
      costPerUnit: 5,
      activationHours: 12,
      supportedLocations: ["Bengaluru FC"],
      qualityRequirements: null,
    };

    const recs = evaluateOutsourcing([task], [order], [fullAllocation], [provider], "2026-10-25");
    expect(recs).toHaveLength(0);
  });
});
