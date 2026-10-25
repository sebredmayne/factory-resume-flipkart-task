import type {
  OrderGroup,
  Redeployment,
  Task,
  WorkforceAllocation,
  WorkforceGroup,
  WorkforceRequirement,
} from "@/lib/types";
import { priorityWeight } from "@/lib/engine/priority";
import {
  crossSkillOutputPerWorker,
  isPrimaryFor,
  primaryOutputPerWorker,
  taskDemandVolume,
} from "@/lib/engine/workforce";

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

export interface AllocationPriorityEntry {
  taskId: string;
  isMandatory: boolean;
  score: number;
}

// The order allocateWorkforce staffs tasks in: mandatory (non-outsourceable)
// tasks are reserved first regardless of score, since skipping them risks
// quality or safety. Everything else is ranked by demand-weighted priority
// score, boosted for tasks that block other tasks downstream. Exposed so
// the UI can explain exactly why a task was staffed before another.
export function getAllocationPriorityOrder(
  tasks: Task[],
  orders: OrderGroup[]
): AllocationPriorityEntry[] {
  const mandatory = tasks.filter((t) => !t.outsourcingEligible);
  const rest = tasks.filter((t) => t.outsourcingEligible);

  const scoredRest: ScoredTask[] = rest.map((task) => ({
    task,
    score: scoreTask(task, orders, tasks),
  }));
  scoredRest.sort((a, b) => b.score - a.score);

  return [
    ...mandatory.map((task) => ({ taskId: task.id, isMandatory: true, score: Infinity })),
    ...scoredRest.map(({ task, score }) => ({
      taskId: task.id,
      isMandatory: false,
      score,
    })),
  ];
}

function orderTasksForAllocation(tasks: Task[], orders: OrderGroup[]): Task[] {
  const taskById = new Map(tasks.map((t) => [t.id, t] as const));
  return getAllocationPriorityOrder(tasks, orders)
    .map((entry) => taskById.get(entry.taskId))
    .filter((t): t is Task => t !== undefined);
}

// One block of workers from one group working on one task, either on their
// own certified task or redeployed into it.
interface Assignment {
  group: WorkforceGroup;
  taskId: string;
  workers: number;
  outputPerWorker: number;
  redeployedFrom: string | null;
}

export interface AllocationOptions {
  // false = "business as usual": everyone stays on their own task.
  allowRedeployment?: boolean;
  // Per-task multiplier on internal output, learned from the daily loop's
  // actuals (1 = the roster's nominal productivity holds).
  calibration?: Record<string, number>;
}

export interface AllocationResult {
  allocations: WorkforceAllocation[];
  redeployments: Redeployment[];
}

const MAX_REBALANCE_MOVES = 1000;

// Function B — deterministic allocation of the surviving workforce, in
// three passes:
//
// 1. Own-skill staffing. Mandatory tasks are staffed first, then the rest
//    in priority order, up to each task's requirement. Anyone left over
//    stays on their own task.
// 2. Line balancing. A fulfilment line ships only as fast as its slowest
//    step, so the engine repeatedly moves one cross-skilled worker from the
//    best-covered task to the worst-covered one — but only when that lifts
//    the worse of the two. Moved workers produce less (productivity factor)
//    and lose ramp-up hours, so a move that costs the donor more than it
//    gives the receiver is never made.
// 3. Guardrails. Certified-only tasks (quality inspection, inventory
//    exceptions) never receive cross-trained staff, and their own staff are
//    never moved out.
//
// This is a transparent heuristic, not a globally optimal assignment: every
// move it makes can be explained in one sentence.
export function allocateWorkforce(
  requirements: WorkforceRequirement[],
  tasks: Task[],
  workforce: WorkforceGroup[],
  orders: OrderGroup[],
  options: AllocationOptions = {}
): AllocationResult {
  const { allowRedeployment = true, calibration = {} } = options;
  const taskById = new Map(tasks.map((t) => [t.id, t] as const));
  const requirementByTaskId = new Map(
    requirements.map((r) => [r.taskId, r] as const)
  );
  const remaining = new Map(workforce.map((g) => [g.id, g.availableWorkers] as const));
  const assignments: Assignment[] = [];

  function assign(
    group: WorkforceGroup,
    taskId: string,
    workers: number,
    outputPerWorker: number,
    redeployedFrom: string | null
  ) {
    const existing = assignments.find(
      (a) =>
        a.group.id === group.id &&
        a.taskId === taskId &&
        a.redeployedFrom === redeployedFrom
    );
    if (existing) existing.workers += workers;
    else assignments.push({ group, taskId, workers, outputPerWorker, redeployedFrom });
  }

  // Pass 1 — own-skill staffing, in priority order.
  const prioritisedTasks = orderTasksForAllocation(tasks, orders);
  for (const task of prioritisedTasks) {
    let stillNeeded = requirementByTaskId.get(task.id)?.requiredWorkers ?? 0;
    for (const group of workforce.filter((g) => isPrimaryFor(g, task))) {
      if (stillNeeded <= 0) break;
      const take = Math.min(remaining.get(group.id) ?? 0, stillNeeded);
      if (take <= 0) continue;
      remaining.set(group.id, (remaining.get(group.id) ?? 0) - take);
      stillNeeded -= take;
      assign(group, task.id, take, primaryOutputPerWorker(group), null);
    }
  }
  for (const group of workforce) {
    const left = remaining.get(group.id) ?? 0;
    if (left <= 0) continue;
    const ownTask = prioritisedTasks.find((t) => isPrimaryFor(group, t));
    if (!ownTask) continue;
    remaining.set(group.id, 0);
    assign(group, ownTask.id, left, primaryOutputPerWorker(group), null);
  }

  const demandByTaskId = new Map(
    tasks.map((t) => [t.id, taskDemandVolume(t.id, orders)] as const)
  );

  function capacityOf(taskId: string, extraRawOutput = 0): number {
    const task = taskById.get(taskId)!;
    const raw = assignments
      .filter((a) => a.taskId === taskId)
      .reduce((sum, a) => sum + a.workers * a.outputPerWorker, extraRawOutput);
    return Math.min(raw * (calibration[taskId] ?? 1), task.maxThroughput);
  }

  function coverage(taskId: string, capacity = capacityOf(taskId)): number {
    const demand = demandByTaskId.get(taskId) ?? 0;
    return demand > 0 ? capacity / demand : Infinity;
  }

  // Pass 2 — line balancing through cross-skilled redeployment.
  if (allowRedeployment) {
    for (let move = 0; move < MAX_REBALANCE_MOVES; move++) {
      const receivers = tasks
        .filter(
          (t) =>
            t.crossTrainingAllowed &&
            (demandByTaskId.get(t.id) ?? 0) > capacityOf(t.id)
        )
        .sort((a, b) => coverage(a.id) - coverage(b.id));

      let best: {
        donor: Assignment;
        receiverId: string;
        outputPerWorker: number;
        newMin: number;
      } | null = null;

      for (const receiver of receivers) {
        const receiverCoverage = coverage(receiver.id);
        for (const donor of assignments) {
          if (donor.redeployedFrom !== null || donor.workers <= 0) continue;
          if (donor.taskId === receiver.id) continue;
          const donorTask = taskById.get(donor.taskId)!;
          if (!donorTask.outsourcingEligible) continue; // never strip mandatory work
          const outputPerWorker = crossSkillOutputPerWorker(donor.group, receiver.id);
          if (outputPerWorker <= 0) continue;

          // Simulate moving one worker.
          donor.workers -= 1;
          const donorAfter = coverage(donor.taskId);
          donor.workers += 1;
          const receiverAfter = coverage(
            receiver.id,
            capacityOf(receiver.id, outputPerWorker)
          );
          const newMin = Math.min(donorAfter, receiverAfter);
          if (newMin > receiverCoverage + 1e-9 && (!best || newMin > best.newMin)) {
            best = { donor, receiverId: receiver.id, outputPerWorker, newMin };
          }
        }
        if (best) break; // fix the worst-covered task first
      }

      if (!best) break;
      best.donor.workers -= 1;
      assign(
        best.donor.group,
        best.receiverId,
        1,
        best.outputPerWorker,
        best.donor.taskId
      );
    }
  }

  const allocations: WorkforceAllocation[] = tasks.map((task) => {
    const onTask = assignments.filter((a) => a.taskId === task.id);
    const allocatedWorkers = onTask.reduce((sum, a) => sum + a.workers, 0);
    const redeployedInWorkers = onTask
      .filter((a) => a.redeployedFrom !== null)
      .reduce((sum, a) => sum + a.workers, 0);
    const requiredWorkers = requirementByTaskId.get(task.id)?.requiredWorkers ?? 0;
    return {
      taskId: task.id,
      allocatedWorkers,
      redeployedInWorkers,
      unfilledWorkers: Math.max(0, requiredWorkers - allocatedWorkers),
      resultingCapacity: Math.round(capacityOf(task.id)),
    };
  });

  const redeployments: Redeployment[] = assignments
    .filter((a) => a.redeployedFrom !== null && a.workers > 0)
    .map((a) => {
      const cross = a.group.crossSkills.find((c) => c.taskId === a.taskId)!;
      return {
        groupId: a.group.id,
        fromTaskId: a.redeployedFrom!,
        toTaskId: a.taskId,
        workers: a.workers,
        productivityFactor: cross.productivityFactor,
        rampUpHours: cross.rampUpHours,
        capacityLost: Math.round(a.workers * primaryOutputPerWorker(a.group)),
        capacityGained: Math.round(a.workers * a.outputPerWorker),
      };
    });

  return { allocations, redeployments };
}
