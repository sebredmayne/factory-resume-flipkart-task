import type {
  OrderGroup,
  Task,
  WorkforceGroup,
  WorkforceRequirement,
} from "@/lib/types";

// Total pending units that need to pass through a given task, across the
// full order backlog. This is the raw task demand — it does not yet
// account for inventory, provider, or staffing constraints.
export function taskDemandVolume(
  taskId: string,
  orders: Pick<OrderGroup, "requiredProcessingSteps" | "quantity">[]
): number {
  return orders
    .filter((order) => order.requiredProcessingSteps.includes(taskId))
    .reduce((sum, order) => sum + order.quantity, 0);
}

export function isPrimaryFor(group: WorkforceGroup, task: Task): boolean {
  return (
    group.skill === task.requiredSkill && group.taskEligibility.includes(task.id)
  );
}

// Units/shift one worker from this group adds to a task they cross-skill
// into: fewer useful hours (ramp-up) at reduced speed.
export function crossSkillOutputPerWorker(
  group: WorkforceGroup,
  taskId: string
): number {
  const cross = group.crossSkills.find((c) => c.taskId === taskId);
  if (!cross) return 0;
  const usefulHours = Math.max(0, group.hoursPerShift - cross.rampUpHours);
  return usefulHours * group.productivityPerHour * cross.productivityFactor;
}

export function primaryOutputPerWorker(group: WorkforceGroup): number {
  return group.hoursPerShift * group.productivityPerHour;
}

// Function A — required labour hours and staffing gap per task.
//
// Required labour hours = demand volume x labour hours per unit.
// Required workers = required labour hours / hours per shift, rounded up
// (workers cannot be fractional). The shortfall compares that requirement
// against workers who are both in the right skill group AND explicitly
// eligible for the task — unqualified headcount is never counted as
// available. Cross-trainable workers elsewhere are reported separately,
// since moving them costs output on the task they leave.
export function calculateWorkforceRequirements(
  orders: OrderGroup[],
  tasks: Task[],
  workforce: WorkforceGroup[]
): WorkforceRequirement[] {
  return tasks.map((task) => {
    const demandVolume = taskDemandVolume(task.id, orders);
    const requiredLabourHours = demandVolume * task.labourHoursPerUnit;

    const qualifiedGroups = workforce.filter((g) => isPrimaryFor(g, task));
    const hoursPerShift = qualifiedGroups[0]?.hoursPerShift ?? 8;
    const availableQualifiedWorkers = qualifiedGroups.reduce(
      (sum, group) => sum + group.availableWorkers,
      0
    );

    const crossTrainableWorkers = task.crossTrainingAllowed
      ? workforce
          .filter(
            (g) =>
              !isPrimaryFor(g, task) &&
              g.crossSkills.some((c) => c.taskId === task.id)
          )
          .reduce((sum, g) => sum + g.availableWorkers, 0)
      : 0;

    const requiredWorkers =
      hoursPerShift > 0 ? Math.ceil(requiredLabourHours / hoursPerShift) : 0;
    const staffingShortfall = Math.max(
      0,
      requiredWorkers - availableQualifiedWorkers
    );

    const rawOutputCapacity = qualifiedGroups.reduce(
      (sum, group) => sum + group.availableWorkers * primaryOutputPerWorker(group),
      0
    );
    const expectedOutputPerShift = Math.min(rawOutputCapacity, task.maxThroughput);

    return {
      taskId: task.id,
      requiredLabourHours,
      requiredWorkers,
      availableQualifiedWorkers,
      crossTrainableWorkers,
      staffingShortfall,
      expectedOutputPerShift,
    };
  });
}
