import { describe, expect, it } from "vitest";
import { generateRecoveryPlan, type BaseData } from "@/lib/engine/recovery";
import type { OrderGroup, Scenario, Task, WorkforceGroup } from "@/lib/types";
import {
  orders,
  workforce,
  tasks,
  inventory,
  providers,
  baselineScenario,
  SCENARIO_TODAY,
} from "@/lib/data";

const noOpScenario: Scenario = {
  id: "s1",
  name: "No changes",
  workforceAvailability: [],
  providerCapacityOverrides: [],
  demandMultiplier: 1,
  materialAvailabilityOverrides: [],
  recoveryResult: null,
};

describe("generateRecoveryPlan — inventory constraint", () => {
  const task: Task = {
    id: "t1",
    name: "Test Task",
    labourHoursPerUnit: 0.01,
    requiredSkill: "picking",
    maxThroughput: 10000,
    prerequisites: [],
    outsourcingEligible: true,
  };
  const plentifulWorkforce: WorkforceGroup = {
    skill: "picking",
    availableWorkers: 100,
    hoursPerShift: 8,
    productivityPerHour: 100,
    qualification: "q",
    taskEligibility: ["t1"],
  };
  const order: OrderGroup = {
    id: "o1",
    sku: "S1",
    quantity: 500,
    priority: "high",
    dueAt: "2026-11-01",
    location: "L1",
    requiredProcessingSteps: ["t1"],
    unitValue: 10,
  };

  it("caps fulfilment at usable inventory even when capacity is plentiful", () => {
    const data: BaseData = {
      orders: [order],
      tasks: [task],
      workforce: [plentifulWorkforce],
      inventory: [
        { sku: "S1", availableQuantity: 300, reservedQuantity: 0, location: "L1", replenishmentETA: null },
      ],
      providers: [],
    };

    const plan = generateRecoveryPlan(noOpScenario, data, "2026-10-25");
    const fulfilment = plan.orderFulfilment.find((f) => f.orderId === "o1")!;

    expect(fulfilment.fulfilledQuantity).toBe(300);
    expect(fulfilment.shortfall).toBe(200);
    expect(fulfilment.limitingFactor).toBe("inventory");
    expect(plan.ordersAtRisk).toContain("o1");
  });

  it("only counts unreserved inventory as usable", () => {
    const data: BaseData = {
      orders: [order],
      tasks: [task],
      workforce: [plentifulWorkforce],
      inventory: [
        { sku: "S1", availableQuantity: 500, reservedQuantity: 250, location: "L1", replenishmentETA: null },
      ],
      providers: [],
    };

    const plan = generateRecoveryPlan(noOpScenario, data, "2026-10-25");
    const fulfilment = plan.orderFulfilment.find((f) => f.orderId === "o1")!;

    expect(fulfilment.fulfilledQuantity).toBe(250); // 500 - 250 reserved
  });
});

describe("generateRecoveryPlan — capacity constraint", () => {
  it("caps fulfilment at achievable internal + outsourced capacity and flags the shortfall", () => {
    const task: Task = {
      id: "t1",
      name: "Scarce Task",
      labourHoursPerUnit: 1,
      requiredSkill: "picking",
      maxThroughput: 10000,
      prerequisites: [],
      outsourcingEligible: false, // no outsourcing lever available
    };
    const scarceWorkforce: WorkforceGroup = {
      skill: "picking",
      availableWorkers: 1,
      hoursPerShift: 8,
      productivityPerHour: 1,
      qualification: "q",
      taskEligibility: ["t1"],
    };
    const order: OrderGroup = {
      id: "o1",
      sku: "S1",
      quantity: 500,
      priority: "high",
      dueAt: "2026-11-01",
      location: "L1",
      requiredProcessingSteps: ["t1"],
      unitValue: 10,
    };
    const data: BaseData = {
      orders: [order],
      tasks: [task],
      workforce: [scarceWorkforce],
      inventory: [
        { sku: "S1", availableQuantity: 10000, reservedQuantity: 0, location: "L1", replenishmentETA: null },
      ],
      providers: [],
    };

    const plan = generateRecoveryPlan(noOpScenario, data, "2026-10-25");
    const fulfilment = plan.orderFulfilment.find((f) => f.orderId === "o1")!;

    expect(fulfilment.fulfilledQuantity).toBe(8); // 1 worker x 8h x 1 unit/hr
    expect(fulfilment.limitingFactor).toBe("capacity");
    expect(plan.constraintViolations.some((v) => v.includes("Scarce Task"))).toBe(true);
  });
});

describe("generateRecoveryPlan — full fixture dataset", () => {
  it("runs end-to-end without throwing and is deterministic for the same scenario", () => {
    const data: BaseData = { orders, tasks, workforce, inventory, providers };

    const first = generateRecoveryPlan(baselineScenario, data, SCENARIO_TODAY);
    const second = generateRecoveryPlan(baselineScenario, data, SCENARIO_TODAY);

    expect(first.totalExpectedFulfilment).toBe(second.totalExpectedFulfilment);
    expect(first.unfulfilledDemand).toBe(second.unfulfilledDemand);
    expect(first.ordersAtRisk).toEqual(second.ordersAtRisk);
    expect(first.incrementalCost).toBe(second.incrementalCost);

    // Sanity bounds: nothing fulfilled beyond what was ordered, nothing negative.
    expect(first.totalExpectedFulfilment).toBeGreaterThan(0);
    expect(first.unfulfilledDemand).toBeGreaterThanOrEqual(0);
    const totalOrdered = orders.reduce((sum, o) => sum + o.quantity, 0);
    expect(first.totalExpectedFulfilment).toBeLessThanOrEqual(totalOrdered);
  });
});
