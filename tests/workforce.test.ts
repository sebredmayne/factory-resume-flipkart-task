import { describe, expect, it } from "vitest";
import { calculateWorkforceRequirements } from "@/lib/engine/workforce";
import type { OrderGroup, Task, WorkforceGroup } from "@/lib/types";

const task: Task = {
  id: "t1",
  name: "Test Task",
  labourHoursPerUnit: 0.1,
  requiredSkill: "picking",
  maxThroughput: 1000,
  prerequisites: [],
  outsourcingEligible: true,
};

const order: OrderGroup = {
  id: "o1",
  sku: "X",
  quantity: 500,
  priority: "high",
  dueAt: "2026-10-30",
  location: "A",
  requiredProcessingSteps: ["t1"],
  unitValue: 10,
};

describe("calculateWorkforceRequirements", () => {
  it("computes required labour hours, required workers (rounded up), and shortfall", () => {
    const workforce: WorkforceGroup[] = [
      {
        skill: "picking",
        availableWorkers: 5,
        hoursPerShift: 8,
        productivityPerHour: 10,
        qualification: "q",
        taskEligibility: ["t1"],
      },
    ];

    const [requirement] = calculateWorkforceRequirements([order], [task], workforce);

    expect(requirement.requiredLabourHours).toBe(50); // 500 * 0.1
    expect(requirement.requiredWorkers).toBe(7); // ceil(50 / 8)
    expect(requirement.availableQualifiedWorkers).toBe(5);
    expect(requirement.staffingShortfall).toBe(2); // 7 - 5
    expect(requirement.expectedOutputPerShift).toBe(400); // 5 * 8 * 10
  });

  it("does not count workers who are in the right skill but not eligible for the task", () => {
    const workforce: WorkforceGroup[] = [
      {
        skill: "picking",
        availableWorkers: 5,
        hoursPerShift: 8,
        productivityPerHour: 10,
        qualification: "q",
        taskEligibility: ["t1"],
      },
      {
        skill: "picking",
        availableWorkers: 20,
        hoursPerShift: 8,
        productivityPerHour: 10,
        qualification: "different cert",
        taskEligibility: ["some-other-task"],
      },
    ];

    const [requirement] = calculateWorkforceRequirements([order], [task], workforce);

    expect(requirement.availableQualifiedWorkers).toBe(5);
  });

  it("caps expected output at the task's physical max throughput", () => {
    const workforce: WorkforceGroup[] = [
      {
        skill: "picking",
        availableWorkers: 1000,
        hoursPerShift: 8,
        productivityPerHour: 100,
        qualification: "q",
        taskEligibility: ["t1"],
      },
    ];

    const [requirement] = calculateWorkforceRequirements([order], [task], workforce);

    expect(requirement.expectedOutputPerShift).toBe(task.maxThroughput);
  });
});
