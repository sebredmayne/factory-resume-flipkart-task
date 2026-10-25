import type {
  OrderGroup,
  Task,
  WorkforceAllocation,
  WorkforceGroup,
  WorkforceRequirement,
} from "@/lib/types";
import { priorityWeight } from "@/lib/engine/priority";

interface ScoredTask {
  task: Task;
  score: number;
}

// Tasks other tasks depend on are prioritised, since delaying them delays
// everything downstream of them too.
function downstreamDependentCount(taskId: string, tasks: Task[]): number {
  return tasks.filter((t) => t.prerequisites.includes(taskId)).length;
}

function scoreTask(task: Task, orders: OrderGroup[], tasks: Task[]): number {
  const demandScore = orders
    .filter((order) => order.requiredProcessingSteps.includes(task.id))
    .reduce(
      (sum, order) => sum + priorityWeight(order.priority) * order.quantity,
      0
    );
  const dependencyBoost = 1 + 0.15 * downstreamDependentCount(task.id, tasks);
  return demandScore * dependencyBoost;
}

// Tasks that cannot be outsourced (quality, safety-critical, exception
// handling) are treated as mandatory: their minimum qualified staffing is
// reserved before anything else is allocated.
function orderTasksForAllocation(
  tasks: Task[],
  orders: OrderGroup[]
): Task[] {
  const mandatory = tasks.filter((t) => !t.outsourcingEligible);
  const rest = tasks.filter((t) => t.outsourcingEligible);

  const scoredRest: ScoredTask[] = rest.map((task) => ({
    task,
    score: scoreTask(task, orders, tasks),
  }));
  scoredRest.sort((a, b) => b.score - a.score);

  return [...mandatory, ...scoredRest.map((s) => s.task)];
}

interface Pool {
  group: WorkforceGroup;
  remaining: number;
}

function poolsForTask(task: Task, pools: Pool[]): Pool[] {
  return pools.filter(
    (pool) =>
      pool.group.skill === task.requiredSkill &&
      pool.group.taskEligibility.includes(task.id)
  );
}

// Function B — deterministic, priority-based allocation of the surviving
// workforce. Mandatory tasks are staffed first, then remaining tasks are
// staffed in priority order until each skill pool runs out. This is a
// transparent baseline heuristic, not a globally optimal assignment.
export function allocateWorkforce(
  requirements: WorkforceRequirement[],
  tasks: Task[],
  workforce: WorkforceGroup[],
  orders: OrderGroup[]
): WorkforceAllocation[] {
  const pools: Pool[] = workforce.map((group) => ({
    group,
    remaining: group.availableWorkers,
  }));

  const requirementByTaskId = new Map(
    requirements.map((r) => [r.taskId, r] as const)
  );

  const allocationByTaskId = new Map<string, WorkforceAllocation>();

  for (const task of orderTasksForAllocation(tasks, orders)) {
    const requirement = requirementByTaskId.get(task.id);
    if (!requirement) continue;

    const eligiblePools = poolsForTask(task, pools);
    let allocatedWorkers = 0;
    let resultingCapacity = 0;
    let stillNeeded = requirement.requiredWorkers;

    for (const pool of eligiblePools) {
      if (stillNeeded <= 0) break;
      const take = Math.min(pool.remaining, stillNeeded);
      if (take <= 0) continue;

      pool.remaining -= take;
      allocatedWorkers += take;
      stillNeeded -= take;
      resultingCapacity +=
        take * pool.group.hoursPerShift * pool.group.productivityPerHour;
    }

    resultingCapacity = Math.min(resultingCapacity, task.maxThroughput);

    allocationByTaskId.set(task.id, {
      taskId: task.id,
      allocatedWorkers,
      unfilledWorkers: Math.max(0, requirement.requiredWorkers - allocatedWorkers),
      resultingCapacity,
    });
  }

  return tasks
    .map((task) => allocationByTaskId.get(task.id))
    .filter((a): a is WorkforceAllocation => a !== undefined);
}
