import type {
  OrderGroup,
  Task,
  WorkforceGroup,
  WorkforceRequirement,
} from "@/lib/types";

// Total pending units that need to pass through a given task, across the
// full order backlog. This is the raw task demand — it does not yet
// account for inventory, provider, or staffing constraints.
export function taskDemandVolume(taskId: string, orders: OrderGroup[]): number {
  return orders
    .filter((order) => order.requiredProcessingSteps.includes(taskId))
    .reduce((sum, order) => sum + order.quantity, 0);
}

function qualifiedWorkersForTask(
  task: Task,
  workforce: WorkforceGroup[]
): WorkforceGroup[] {
  return workforce.filter(
    (group) =>
      group.skill === task.requiredSkill &&
      group.taskEligibility.includes(task.id)
  );
}

// Function A — required labour hours and staffing gap per task.
//
// Required labour hours = demand volume x labour hours per unit.
// Required workers = required labour hours / hours per shift, rounded up
// (workers cannot be fractional). The shortfall compares that requirement
// against workers who are both in the right skill group AND explicitly
// eligible for the task — unqualified headcount is never counted as
// available.
export function calculateWorkforceRequirements(
  orders: OrderGroup[],
  tasks: Task[],
  workforce: WorkforceGroup[]
): WorkforceRequirement[] {
  return tasks.map((task) => {
    const demandVolume = taskDemandVolume(task.id, orders);
    const requiredLabourHours = demandVolume * task.labourHoursPerUnit;

    const qualifiedGroups = qualifiedWorkersForTask(task, workforce);
    const hoursPerShift = qualifiedGroups[0]?.hoursPerShift ?? 8;
    const availableQualifiedWorkers = qualifiedGroups.reduce(
      (sum, group) => sum + group.availableWorkers,
      0
    );

    const requiredWorkers =
      hoursPerShift > 0 ? Math.ceil(requiredLabourHours / hoursPerShift) : 0;
    const staffingShortfall = Math.max(
      0,
      requiredWorkers - availableQualifiedWorkers
    );

    const rawOutputCapacity = qualifiedGroups.reduce(
      (sum, group) =>
        sum + group.availableWorkers * group.hoursPerShift * group.productivityPerHour,
      0
    );
    const expectedOutputPerShift = Math.min(rawOutputCapacity, task.maxThroughput);

    return {
      taskId: task.id,
      requiredLabourHours,
      requiredWorkers,
      availableQualifiedWorkers,
      staffingShortfall,
      expectedOutputPerShift,
    };
  });
}
