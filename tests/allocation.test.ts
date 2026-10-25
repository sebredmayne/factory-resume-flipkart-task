import { describe, expect, it } from "vitest";
import { allocateWorkforce } from "@/lib/engine/allocation";
import { calculateWorkforceRequirements } from "@/lib/engine/workforce";
import type { WorkforceRequirement } from "@/lib/types";
import { makeGroup, makeOrder, makeTask } from "./helpers";

function requirement(taskId: string, requiredWorkers: number): WorkforceRequirement {
  return {
    taskId,
    requiredLabourHours: requiredWorkers * 8,
    requiredWorkers,
    availableQualifiedWorkers: 0,
    crossTrainableWorkers: 0,
    staffingShortfall: 0,
    expectedOutputPerShift: 0,
  };
}

describe("allocateWorkforce — own-skill staffing", () => {
  it("reserves mandatory (non-outsourceable) tasks before discretionary ones sharing the same pool", () => {
    const mandatory = makeTask({ id: "quality_inspection", outsourcingEligible: false, crossTrainingAllowed: false });
    const discretionary = makeTask({ id: "picking" });
    const pool = makeGroup({ id: "shared", taskEligibility: ["quality_inspection", "picking"] });
    const orders = [
      makeOrder({ id: "o-m", priority: "standard", requiredProcessingSteps: ["quality_inspection"], quantity: 24 }),
      makeOrder({ id: "o-d", priority: "critical", requiredProcessingSteps: ["picking"], quantity: 320 }),
    ];

    const { allocations } = allocateWorkforce(
      [requirement("quality_inspection", 3), requirement("picking", 4)],
      [mandatory, discretionary],
      [pool],
      orders
    );
    const m = allocations.find((a) => a.taskId === "quality_inspection")!;
    const d = allocations.find((a) => a.taskId === "picking")!;

    // Mandatory task gets its full 3 workers first, even though the
    // discretionary task has a "critical" order and only 2 remain.
    expect(m.allocatedWorkers).toBe(3);
    expect(d.allocatedWorkers).toBe(2);
    expect(d.unfilledWorkers).toBe(2);
    expect(m.allocatedWorkers + d.allocatedWorkers).toBeLessThanOrEqual(5);
  });

  it("never allocates workers to a task outside their skill, eligibility or cross-skills", () => {
    const picking = makeTask({ id: "picking" });
    const dispatch = makeTask({ id: "dispatch", requiredSkill: "dispatch_coordination" });
    const pickers = makeGroup({ id: "pickers", taskEligibility: ["picking"] });
    const orders = [makeOrder({ id: "o1", requiredProcessingSteps: ["dispatch"] })];

    const { allocations, redeployments } = allocateWorkforce(
      [requirement("picking", 0), requirement("dispatch", 2)],
      [picking, dispatch],
      [pickers],
      orders
    );

    expect(allocations.find((a) => a.taskId === "dispatch")!.allocatedWorkers).toBe(0);
    expect(redeployments).toHaveLength(0);
  });
});

describe("allocateWorkforce — cross-skilled redeployment", () => {
  // A two-step line: every unit is picked, then packed. 10 pickers but only
  // 2 packers, so packing is the bottleneck and picking capacity is wasted.
  const picking = makeTask({ id: "picking" });
  const packing = makeTask({ id: "packing", requiredSkill: "packing" });
  const orders = [makeOrder({ id: "o1", quantity: 1000, requiredProcessingSteps: ["picking", "packing"] })];
  const pickers = makeGroup({
    id: "pickers",
    availableWorkers: 10,
    taskEligibility: ["picking"],
    crossSkills: [{ taskId: "packing", productivityFactor: 0.5, rampUpHours: 0 }],
  });
  const packers = makeGroup({ id: "packers", skill: "packing", availableWorkers: 2, taskEligibility: ["packing"] });

  function run(allowRedeployment: boolean) {
    const requirements = calculateWorkforceRequirements(orders, [picking, packing], [pickers, packers]);
    return allocateWorkforce(requirements, [picking, packing], [pickers, packers], orders, { allowRedeployment });
  }

  it("moves cross-skilled workers to the bottleneck until the line is balanced", () => {
    const { allocations, redeployments } = run(true);
    const pick = allocations.find((a) => a.taskId === "picking")!;
    const pack = allocations.find((a) => a.taskId === "packing")!;

    // Before: picking 800, packing 160 -> the line ships 160.
    // Each moved picker costs picking 80 and adds 40 to packing.
    // Balanced at 5 moved: picking 400, packing 360.
    expect(redeployments).toEqual([
      expect.objectContaining({ groupId: "pickers", fromTaskId: "picking", toTaskId: "packing", workers: 5 }),
    ]);
    expect(pack.redeployedInWorkers).toBe(5);
    expect(Math.min(pick.resultingCapacity, pack.resultingCapacity)).toBe(360);
  });

  it("leaves everyone on their own task when redeployment is off (business as usual)", () => {
    const { allocations, redeployments } = run(false);
    expect(redeployments).toHaveLength(0);
    expect(allocations.find((a) => a.taskId === "packing")!.resultingCapacity).toBe(160);
  });

  it("never cross-trains into a certified-only task, nor strips a mandatory one", () => {
    const qa = makeTask({ id: "qa", requiredSkill: "quality_inspection", outsourcingEligible: false, crossTrainingAllowed: false });
    const qaOrders = [makeOrder({ id: "o1", quantity: 1000, requiredProcessingSteps: ["picking", "qa"] })];
    const eagerPickers = makeGroup({
      id: "pickers",
      availableWorkers: 10,
      taskEligibility: ["picking"],
      crossSkills: [{ taskId: "qa", productivityFactor: 1, rampUpHours: 0 }],
    });
    const inspectors = makeGroup({
      id: "inspectors",
      skill: "quality_inspection",
      availableWorkers: 10,
      taskEligibility: ["qa"],
      crossSkills: [{ taskId: "picking", productivityFactor: 1, rampUpHours: 0 }],
    });
    const requirements = calculateWorkforceRequirements(qaOrders, [picking, qa], [eagerPickers, inspectors]);

    const { redeployments } = allocateWorkforce(requirements, [picking, qa], [eagerPickers, inspectors], qaOrders);

    expect(redeployments).toHaveLength(0);
  });
});
