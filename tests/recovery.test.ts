import { describe, expect, it } from "vitest";
import { generateRecoveryPlan } from "@/lib/engine/recovery";
import { baseData, baselineScenario, SCENARIO_TODAY } from "@/lib/data";
import type { OrderInput } from "@/lib/types";
import { makeData, makeGroup, makeTask, noOpScenario } from "./helpers";

const task = makeTask({ id: "t1", labourHoursPerUnit: 0.01 });
const plentiful = makeGroup({ id: "g1", availableWorkers: 100, productivityPerHour: 100, taskEligibility: ["t1"] });
const order: OrderInput = {
  id: "o1",
  sku: "S1",
  quantity: 500,
  dueAt: "2026-11-01",
  location: "L1",
  requiredProcessingSteps: ["t1"],
  unitValue: 10,
};
const stock = (availableQuantity: number, reservedQuantity = 0) => ({
  sku: "S1", availableQuantity, reservedQuantity, location: "L1", replenishmentETA: null, replenishmentQuantity: 0,
});

describe("generateRecoveryPlan — inventory constraint", () => {
  it("caps fulfilment at usable inventory even when capacity is plentiful", () => {
    const data = makeData({ orders: [order], tasks: [task], workforce: [plentiful], inventory: [stock(300)] });

    const plan = generateRecoveryPlan(noOpScenario, data, "2026-10-25");
    const f = plan.orderFulfilment[0];

    expect(f).toMatchObject({ fulfilledQuantity: 300, shortfall: 200, limitingFactor: "inventory" });
    expect(plan.ordersAtRisk).toContain("o1");
  });

  it("only counts unreserved inventory as usable", () => {
    const data = makeData({ orders: [order], tasks: [task], workforce: [plentiful], inventory: [stock(500, 250)] });
    const plan = generateRecoveryPlan(noOpScenario, data, "2026-10-25");
    expect(plan.orderFulfilment[0].fulfilledQuantity).toBe(250);
  });
});

describe("generateRecoveryPlan — capacity constraint", () => {
  it("caps fulfilment at achievable capacity and flags the shortfall", () => {
    const scarceTask = makeTask({ id: "t1", name: "Scarce Task", labourHoursPerUnit: 1, outsourcingEligible: false });
    const scarce = makeGroup({ id: "g1", availableWorkers: 1, productivityPerHour: 1, taskEligibility: ["t1"] });
    const data = makeData({ orders: [order], tasks: [scarceTask], workforce: [scarce], inventory: [stock(10000)] });

    const plan = generateRecoveryPlan(noOpScenario, data, "2026-10-25");

    expect(plan.orderFulfilment[0]).toMatchObject({ fulfilledQuantity: 8, limitingFactor: "capacity" });
    expect(plan.constraintViolations.some((v) => v.includes("Scarce Task"))).toBe(true);
  });
});

describe("generateRecoveryPlan — last mile", () => {
  it("can't ship more than couriers can carry out of a location", () => {
    const data = makeData({
      orders: [order],
      tasks: [task],
      workforce: [plentiful],
      inventory: [stock(10000)],
      lastMile: [{ location: "L1", carrier: "C", capacityPerDay: 120 }],
    });

    const plan = generateRecoveryPlan(noOpScenario, data, "2026-10-25");

    expect(plan.orderFulfilment[0]).toMatchObject({ fulfilledQuantity: 120, limitingFactor: "last_mile" });
  });
});

describe("generateRecoveryPlan — needs-based priority", () => {
  // 100 units of capacity, two orders of 100: a discretionary one due
  // tomorrow and an essential one due in four days.
  const tight = makeGroup({ id: "g1", availableWorkers: 1, productivityPerHour: 12.5, taskEligibility: ["t1"] });
  const data = makeData({
    orders: [
      { ...order, id: "lipbalm", sku: "LIP", quantity: 100, dueAt: "2026-10-26" },
      { ...order, id: "soap", sku: "SOAP", quantity: 100, dueAt: "2026-10-29" },
    ],
    products: [
      { sku: "LIP", name: "Lip balm", essentiality: "discretionary" },
      { sku: "SOAP", name: "Soap", essentiality: "essential" },
    ],
    tasks: [makeTask({ id: "t1", outsourcingEligible: false })],
    workforce: [tight],
    inventory: [
      { ...stock(1000), sku: "LIP" },
      { ...stock(1000), sku: "SOAP" },
    ],
  });
  const shipped = (strategy: "managed" | "unmanaged") =>
    Object.fromEntries(
      generateRecoveryPlan(noOpScenario, data, "2026-10-25", { strategy })
        .orderFulfilment.map((f) => [f.orderId, f.fulfilledQuantity])
    );

  it("ships the essential first even though the discretionary order is due sooner", () => {
    expect(shipped("managed")).toEqual({ soap: 100, lipbalm: 0 });
  });

  it("the unmanaged counterfactual ships first-due-first instead", () => {
    expect(shipped("unmanaged")).toEqual({ lipbalm: 100, soap: 0 });
  });
});

describe("generateRecoveryPlan — full fixture dataset", () => {
  it("is deterministic, and beats the unmanaged counterfactual on Day 1", () => {
    const first = generateRecoveryPlan(baselineScenario, baseData, SCENARIO_TODAY);
    const second = generateRecoveryPlan(baselineScenario, baseData, SCENARIO_TODAY);
    const unmanaged = generateRecoveryPlan(baselineScenario, baseData, SCENARIO_TODAY, { strategy: "unmanaged" });

    expect(first).toEqual(second);
    const totalOrdered = baseData.orders.reduce((sum, o) => sum + o.quantity, 0);
    expect(first.totalExpectedFulfilment).toBeLessThanOrEqual(totalOrdered);
    expect(first.totalExpectedFulfilment).toBeGreaterThan(unmanaged.totalExpectedFulfilment);
    expect(first.essentialUnitsFulfilled).toBeGreaterThan(unmanaged.essentialUnitsFulfilled);
    // No packing partner can start on Day 1, so redeployment is the lever.
    expect(first.redeployments.some((r) => r.toTaskId === "packing")).toBe(true);
  });
});
