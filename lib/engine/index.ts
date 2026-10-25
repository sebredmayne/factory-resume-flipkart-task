export { calculateWorkforceRequirements, taskDemandVolume } from "@/lib/engine/workforce";
export { allocateWorkforce, getAllocationPriorityOrder } from "@/lib/engine/allocation";
export type { AllocationPriorityEntry } from "@/lib/engine/allocation";
export { evaluateOutsourcing } from "@/lib/engine/outsourcing";
export { applyScenario, generateRecoveryPlan } from "@/lib/engine/recovery";
export type { BaseData } from "@/lib/engine/recovery";
export { simulateScenario } from "@/lib/engine/simulation";
export type { ScenarioChanges, SimulationResult } from "@/lib/engine/simulation";
export { priorityWeight, daysUntil, compareOrdersByUrgency } from "@/lib/engine/priority";
