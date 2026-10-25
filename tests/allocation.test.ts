import { describe, expect, it } from "vitest";
import { allocateWorkforce } from "@/lib/engine/allocation";
import type { OrderGroup, Task, WorkforceGroup, WorkforceRequirement } from "@/lib/types";

const mandatoryTask: Task = {
  id: "quality_inspection",
  name: "Quality Inspection",
  labourHoursPerUnit: 0.1,
  requiredSkill: "picking",
  maxThroughput: 1000,
  prerequisites: [],
  outsourcingEligible: false,
};

const outsourceableTask: Task = {
  id: "picking",
  name: "Picking",
  labourHoursPerUnit: 0.1,
  requiredSkill: "picking",
  maxThroughput: 1000,
  prerequisites: [],
  outsourcingEligible: true,
};

const otherSkillTask: Task = {
  id: "dispatch",
  name: "Dispatch",
  labourHoursPerUnit: 0.1,
  requiredSkill: "dispatch_coordination",
  maxThroughput: 1000,
  prerequisites: [],
  outsourcingEligible: true,
};

const sharedPool: WorkforceGroup = {
  skill: "picking",
  availableWorkers: 5,
  hoursPerShift: 8,
  productivityPerHour: 10,
  qualification: "q",
  taskEligibility: ["quality_inspection", "picking"],
};

const unrelatedPool: WorkforceGroup = {
  skill: "dispatch_coordination",
  availableWorkers: 0,
  hoursPerShift: 8,
  productivityPerHour: 10,
  qualification: "q",
  taskEligibility: ["dispatch"],
};

function order(id: string, priority: OrderGroup["priority"], taskId: string, quantity: number): OrderGroup {
  return {
    id,
    sku: "X",
    quantity,
    priority,
    dueAt: "2026-10-30",
    location: "A",
    requiredProcessingSteps: [taskId],
    unitValue: 10,
  };
}

describe("allocateWorkforce", () => {
  it("reserves mandatory (non-outsourceable) tasks before discretionary ones sharing the same pool", () => {
    const tasks = [mandatoryTask, outsourceableTask];
    const workforce = [sharedPool];
    // Requirements are supplied directly below; these orders only exist to
    // drive the (here irrelevant, since there's one discretionary task)
    // priority scoring that ranks discretionary tasks against each other.
    const orders = [
      order("o-mandatory", "standard", "quality_inspection", 24),
      order("o-discretionary", "critical", "picking", 320),
    ];

    const requirements: WorkforceRequirement[] = [
      {
        taskId: "quality_inspection",
        requiredLabourHours: 24,
        requiredWorkers: 3,
        availableQualifiedWorkers: 5,
        staffingShortfall: 0,
        expectedOutputPerShift: 400,
      },
      {
        taskId: "picking",
        requiredLabourHours: 32,
        requiredWorkers: 4,
        availableQualifiedWorkers: 5,
        staffingShortfall: 0,
        expectedOutputPerShift: 400,
      },
    ];

    const allocations = allocateWorkforce(requirements, tasks, workforce, orders);
    const mandatoryAllocation = allocations.find((a) => a.taskId === "quality_inspection")!;
    const discretionaryAllocation = allocations.find((a) => a.taskId === "picking")!;

    // Mandatory task gets its full 3 workers reserved first, even though
    // the discretionary task has a "critical" order and only 2 remain.
    expect(mandatoryAllocation.allocatedWorkers).toBe(3);
    expect(mandatoryAllocation.unfilledWorkers).toBe(0);
    expect(discretionaryAllocation.allocatedWorkers).toBe(2);
    expect(discretionaryAllocation.unfilledWorkers).toBe(2);

    // The shared pool of 5 is never over-allocated.
    const totalAllocated = mandatoryAllocation.allocatedWorkers + discretionaryAllocation.allocatedWorkers;
    expect(totalAllocated).toBeLessThanOrEqual(5);
  });

  it("never allocates workers to a task outside their skill/eligibility", () => {
    const tasks = [outsourceableTask, otherSkillTask];
    const workforce = [sharedPool, unrelatedPool];
    const orders = [order("o1", "high", "dispatch", 100)];

    const requirements: WorkforceRequirement[] = [
      {
        taskId: "picking",
        requiredLabourHours: 0,
        requiredWorkers: 0,
        availableQualifiedWorkers: 5,
        staffingShortfall: 0,
        expectedOutputPerShift: 0,
      },
      {
        taskId: "dispatch",
        requiredLabourHours: 10,
        requiredWorkers: 2,
        availableQualifiedWorkers: 0,
        staffingShortfall: 2,
        expectedOutputPerShift: 0,
      },
    ];

    const allocations = allocateWorkforce(requirements, tasks, workforce, orders);
    const dispatchAllocation = allocations.find((a) => a.taskId === "dispatch")!;

    // unrelatedPool has 0 available workers and the picking pool is not
    // eligible for "dispatch", so the requirement goes entirely unfilled.
    expect(dispatchAllocation.allocatedWorkers).toBe(0);
    expect(dispatchAllocation.unfilledWorkers).toBe(2);
  });
});
