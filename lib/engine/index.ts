export {
  calculateWorkforceRequirements,
  taskDemandVolume,
  crossSkillOutputPerWorker,
  primaryOutputPerWorker,
} from "@/lib/engine/workforce";
export { allocateWorkforce, getAllocationPriorityOrder } from "@/lib/engine/allocation";
export type { AllocationPriorityEntry, AllocationResult } from "@/lib/engine/allocation";
export { evaluateOutsourcing, providerActiveFraction } from "@/lib/engine/outsourcing";
export { applyScenario, generateRecoveryPlan } from "@/lib/engine/recovery";
export type { BaseData, PlanContext, PlanStrategy } from "@/lib/engine/recovery";
export { simulateScenario } from "@/lib/engine/simulation";
export type { ScenarioChanges, SimulationResult } from "@/lib/engine/simulation";
export {
  initialDayState,
  planDay,
  closeDay,
  plannedTaskUnits,
  projectOutlook,
  summariseOutcome,
  addDays,
} from "@/lib/engine/daily";
export type { DayState, DayRecord, Outlook, OutcomeSummary, TaskActuals } from "@/lib/engine/daily";
export {
  priorityWeight,
  daysUntil,
  compareOrdersByUrgency,
  derivePriority,
  prioritiseOrders,
} from "@/lib/engine/priority";
export { bindingConstraint } from "@/lib/engine/insights";
export type { BindingConstraint } from "@/lib/engine/insights";
