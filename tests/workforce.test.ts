import { describe, expect, it } from "vitest";
import { calculateWorkforceRequirements } from "@/lib/engine/workforce";
import { makeGroup, makeOrder, makeTask } from "./helpers";

const task = makeTask({ id: "t1", maxThroughput: 1000 });
const order = makeOrder({ id: "o1", quantity: 500 });

describe("calculateWorkforceRequirements", () => {
  it("computes required labour hours, required workers (rounded up), and shortfall", () => {
    const workforce = [makeGroup({ id: "g1", taskEligibility: ["t1"] })];

    const [requirement] = calculateWorkforceRequirements([order], [task], workforce);

    expect(requirement.requiredLabourHours).toBe(50); // 500 * 0.1
    expect(requirement.requiredWorkers).toBe(7); // ceil(50 / 8)
    expect(requirement.availableQualifiedWorkers).toBe(5);
    expect(requirement.staffingShortfall).toBe(2); // 7 - 5
    expect(requirement.expectedOutputPerShift).toBe(400); // 5 * 8 * 10
  });

  it("does not count workers who are in the right skill but not eligible for the task", () => {
    const workforce = [
      makeGroup({ id: "g1", taskEligibility: ["t1"] }),
      makeGroup({ id: "g2", availableWorkers: 20, taskEligibility: ["some-other-task"] }),
    ];

    const [requirement] = calculateWorkforceRequirements([order], [task], workforce);

    expect(requirement.availableQualifiedWorkers).toBe(5);
  });

  it("reports cross-trainable workers separately, and none for certified-only tasks", () => {
    const workforce = [
      makeGroup({ id: "own", taskEligibility: ["t1"] }),
      makeGroup({
        id: "other",
        skill: "packing",
        availableWorkers: 6,
        taskEligibility: ["t2"],
        crossSkills: [{ taskId: "t1", productivityFactor: 0.5, rampUpHours: 2 }],
      }),
    ];

    const [open] = calculateWorkforceRequirements([order], [task], workforce);
    const [certified] = calculateWorkforceRequirements(
      [order],
      [{ ...task, crossTrainingAllowed: false }],
      workforce
    );

    expect(open.availableQualifiedWorkers).toBe(5);
    expect(open.crossTrainableWorkers).toBe(6);
    expect(certified.crossTrainableWorkers).toBe(0);
  });

  it("caps expected output at the task's physical max throughput", () => {
    const workforce = [
      makeGroup({ id: "g1", availableWorkers: 1000, productivityPerHour: 100, taskEligibility: ["t1"] }),
    ];

    const [requirement] = calculateWorkforceRequirements([order], [task], workforce);

    expect(requirement.expectedOutputPerShift).toBe(task.maxThroughput);
  });
});
