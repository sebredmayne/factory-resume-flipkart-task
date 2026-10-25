// Shared domain types for Factory Resume.
// These mirror the data model in plan.md section 5, extended with
// cross-skilling, needs-based priority, last-mile capacity and the daily
// re-planning loop.

export type Priority = "critical" | "high" | "standard" | "low";

// How much a product matters to a household when supply is scarce. This is
// an operator-set policy input (in a real crisis, often set by regulation),
// not something the engine infers.
export type Essentiality = "essential" | "everyday" | "discretionary";

export type Skill =
  | "picking"
  | "packing"
  | "quality_inspection"
  | "inventory_exceptions"
  | "dispatch_coordination";

export interface Product {
  sku: string;
  name: string;
  essentiality: Essentiality;
}

// An order as it exists in the order system — no priority yet. Priority is
// derived by the engine from essentiality and due date (see priority.ts),
// so it re-ranks itself as days pass.
export interface OrderInput {
  id: string;
  sku: string;
  quantity: number;
  dueAt: string; // ISO date
  location: string;
  requiredProcessingSteps: string[]; // Task ids, in order
  unitValue: number;
}

export interface OrderGroup extends OrderInput {
  essentiality: Essentiality;
  priority: Priority;
  priorityReason: string;
}

// A secondary task a group can be redeployed to, at reduced speed and after
// a short on-the-job ramp-up.
export interface CrossSkill {
  taskId: string;
  productivityFactor: number; // 0-1, relative to the group's own productivity
  rampUpHours: number; // shift hours lost to training before useful output
}

export interface WorkforceGroup {
  id: string;
  skill: Skill;
  availableWorkers: number;
  hoursPerShift: number;
  productivityPerHour: number; // units processed per worker per hour
  qualification: string;
  taskEligibility: string[]; // Task ids this group is certified for
  crossSkills: CrossSkill[];
}

export interface Task {
  id: string;
  name: string;
  labourHoursPerUnit: number;
  requiredSkill: Skill;
  maxThroughput: number; // units per shift, machine/line constrained
  prerequisites: string[]; // Task ids that must complete first
  outsourcingEligible: boolean;
  crossTrainingAllowed: boolean; // false = certified staff only
}

export interface InventoryItem {
  sku: string;
  availableQuantity: number;
  reservedQuantity: number;
  location: string;
  replenishmentETA: string | null; // ISO date, null if no pending replenishment
  replenishmentQuantity: number;
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

// Courier capacity out of a fulfilment centre. Packed orders that can't
// get on a truck don't reach anyone.
export interface LastMileLane {
  location: string;
  carrier: string;
  capacityPerDay: number; // units per day
}

// Pre-disruption daily order intake for one SKU at one location. The daily
// loop scales this by the scenario's demand shift to generate new orders.
export interface DailyDemand {
  sku: string;
  location: string;
  unitsPerDay: number;
  requiredProcessingSteps: string[];
  unitValue: number;
  dueInDays: number;
}

export interface WorkforceAvailabilityOverride {
  groupId: string;
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

export interface LastMileOverride {
  location: string;
  capacityPerDay: number;
}

// New-order intake relative to pre-disruption demand, per essentiality.
// 1 = unchanged, 0.5 = half of normal.
export type DemandShift = Record<Essentiality, number>;

export interface LocationDemandOverride {
  location: string;
  multiplier: number;
}

export interface Scenario {
  id: string;
  name: string;
  workforceAvailability: WorkforceAvailabilityOverride[];
  providerCapacityOverrides: ProviderCapacityOverride[];
  materialAvailabilityOverrides: MaterialAvailabilityOverride[];
  lastMileOverrides: LastMileOverride[];
  demandShift: DemandShift;
  locationDemand: LocationDemandOverride[];
  recoveryResult: RecoveryPlan | null;
}

// --- Engine output types ---

export interface WorkforceRequirement {
  taskId: string;
  requiredLabourHours: number;
  requiredWorkers: number;
  availableQualifiedWorkers: number;
  crossTrainableWorkers: number; // in other groups, able to cover this task
  staffingShortfall: number;
  expectedOutputPerShift: number;
}

export interface WorkforceAllocation {
  taskId: string;
  allocatedWorkers: number; // own-skill plus redeployed
  redeployedInWorkers: number;
  unfilledWorkers: number;
  resultingCapacity: number;
}

export interface Redeployment {
  groupId: string;
  fromTaskId: string;
  toTaskId: string;
  workers: number;
  productivityFactor: number;
  rampUpHours: number;
  capacityLost: number; // units/shift given up on the source task
  capacityGained: number; // units/shift added on the destination task
}

export interface OutsourcingRecommendation {
  taskId: string;
  providerId: string;
  recommendedVolume: number;
  estimatedCost: number;
  expectedAdditionalThroughput: number;
  availableFraction: number; // share of the provider's day usable today
  ordersRecovered: string[];
  rationale: string;
  risks: string[];
}

// A provider that can't help today because of activation lead time, but is
// needed — request it now so it's live when it matters.
export interface ProviderRequestAdvice {
  providerId: string;
  taskId: string;
  availableFromDay: number;
  reason: string;
}

export type FulfilmentLimitingFactor =
  | "capacity"
  | "inventory"
  | "last_mile"
  | "none";

export interface OrderFulfilment {
  orderId: string;
  requestedQuantity: number;
  fulfilledQuantity: number;
  shortfall: number;
  limitingFactor: FulfilmentLimitingFactor;
}

export interface RecoveryPlan {
  dayIndex: number;
  orders: OrderGroup[]; // the prioritised, scenario-adjusted backlog planned against
  workforceRequirements: WorkforceRequirement[];
  internalAllocations: WorkforceAllocation[];
  redeployments: Redeployment[];
  outsourcedVolumes: OutsourcingRecommendation[];
  providerRequests: ProviderRequestAdvice[];
  orderFulfilment: OrderFulfilment[];
  totalExpectedFulfilment: number;
  unfulfilledDemand: number;
  essentialUnitsRequested: number;
  essentialUnitsFulfilled: number;
  ordersAtRisk: string[];
  incrementalCost: number;
  constraintViolations: string[];
  generatedAt: string; // ISO date
}

export interface ScenarioComparison {
  fulfilmentDelta: number;
  costDelta: number;
  atRiskCountDelta: number;
  essentialOnTimeDelta: number; // percentage points, over the outlook
  endBacklogDelta: number; // units still unshipped at the end of the outlook
  newlyAtRiskOrders: string[];
  recoveredOrders: string[];
}
