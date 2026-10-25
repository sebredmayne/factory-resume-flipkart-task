// Shared domain types for Factory Resume.
// These mirror the data model in plan.md section 5.

export type Priority = "critical" | "high" | "standard" | "low";

export type Skill =
  | "picking"
  | "packing"
  | "quality_inspection"
  | "inventory_exceptions"
  | "dispatch_coordination";

export interface OrderGroup {
  id: string;
  sku: string;
  quantity: number;
  priority: Priority;
  dueAt: string; // ISO date
  location: string;
  requiredProcessingSteps: string[]; // Task ids, in order
  unitValue: number;
}

export interface WorkforceGroup {
  skill: Skill;
  availableWorkers: number;
  hoursPerShift: number;
  productivityPerHour: number; // units processed per worker per hour
  qualification: string;
  taskEligibility: string[]; // Task ids this group can perform
}

export interface Task {
  id: string;
  name: string;
  labourHoursPerUnit: number;
  requiredSkill: Skill;
  maxThroughput: number; // units per shift, machine/line constrained
  prerequisites: string[]; // Task ids that must complete first
  outsourcingEligible: boolean;
}

export interface InventoryItem {
  sku: string;
  availableQuantity: number;
  reservedQuantity: number;
  location: string;
  replenishmentETA: string | null; // ISO date, null if no pending replenishment
}

export interface ExternalProvider {
  id: string;
  name: string;
  services: string[]; // Task ids this provider can perform
  availableCapacity: number; // units per day
  costPerUnit: number;
  activationHours: number; // lead time before the provider can start
  supportedLocations: string[];
  qualityRequirements: string | null;
}

export interface WorkforceAvailabilityOverride {
  skill: Skill;
  availableWorkers: number;
}

export interface ProviderCapacityOverride {
  providerId: string;
  availableCapacity: number;
}

export interface MaterialAvailabilityOverride {
  sku: string;
  availableQuantity: number;
}

export interface Scenario {
  id: string;
  name: string;
  workforceAvailability: WorkforceAvailabilityOverride[];
  providerCapacityOverrides: ProviderCapacityOverride[];
  demandMultiplier: number; // 1 = no change, 1.15 = +15% demand
  materialAvailabilityOverrides: MaterialAvailabilityOverride[];
  recoveryResult: RecoveryPlan | null;
}

// --- Engine output types (populated in Phase 2) ---

export interface WorkforceRequirement {
  taskId: string;
  requiredLabourHours: number;
  requiredWorkers: number;
  availableQualifiedWorkers: number;
  staffingShortfall: number;
  expectedOutputPerShift: number;
}

export interface WorkforceAllocation {
  taskId: string;
  allocatedWorkers: number;
  unfilledWorkers: number;
  resultingCapacity: number;
}

export interface OutsourcingRecommendation {
  taskId: string;
  providerId: string;
  recommendedVolume: number;
  estimatedCost: number;
  expectedAdditionalThroughput: number;
  ordersRecovered: string[];
  rationale: string;
  risks: string[];
}

export type FulfilmentLimitingFactor = "capacity" | "inventory" | "none";

export interface OrderFulfilment {
  orderId: string;
  requestedQuantity: number;
  fulfilledQuantity: number;
  shortfall: number;
  limitingFactor: FulfilmentLimitingFactor;
}

export interface RecoveryPlan {
  workforceRequirements: WorkforceRequirement[];
  internalAllocations: WorkforceAllocation[];
  outsourcedVolumes: OutsourcingRecommendation[];
  orderFulfilment: OrderFulfilment[];
  totalExpectedFulfilment: number;
  unfulfilledDemand: number;
  ordersAtRisk: string[];
  incrementalCost: number;
  constraintViolations: string[];
  generatedAt: string; // ISO date
}

export interface ScenarioComparison {
  fulfilmentDelta: number;
  costDelta: number;
  atRiskCountDelta: number;
  newlyAtRiskOrders: string[];
  recoveredOrders: string[];
}
