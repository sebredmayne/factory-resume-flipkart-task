import type {
  ExternalProvider,
  OrderGroup,
  Scenario,
  Task,
  WorkforceGroup,
} from "@/lib/types";
import type { BaseData } from "@/lib/engine/recovery";

// Small builders so each test states only the fields it cares about.

export function makeTask(overrides: Partial<Task> & Pick<Task, "id">): Task {
  return {
    name: overrides.id,
    labourHoursPerUnit: 0.1,
    requiredSkill: "picking",
    maxThroughput: 10000,
    prerequisites: [],
    outsourcingEligible: true,
    crossTrainingAllowed: true,
    ...overrides,
  };
}

export function makeGroup(
  overrides: Partial<WorkforceGroup> & Pick<WorkforceGroup, "id">
): WorkforceGroup {
  return {
    skill: "picking",
    availableWorkers: 5,
    hoursPerShift: 8,
    productivityPerHour: 10,
    qualification: "q",
    taskEligibility: [],
    crossSkills: [],
    ...overrides,
  };
}

export function makeOrder(
  overrides: Partial<OrderGroup> & Pick<OrderGroup, "id">
): OrderGroup {
  return {
    sku: "S1",
    quantity: 100,
    dueAt: "2026-10-30",
    location: "L1",
    requiredProcessingSteps: ["t1"],
    unitValue: 10,
    essentiality: "everyday",
    priority: "standard",
    priorityReason: "",
    ...overrides,
  };
}

export function makeProvider(
  overrides: Partial<ExternalProvider> & Pick<ExternalProvider, "id">
): ExternalProvider {
  return {
    name: overrides.id,
    services: ["packing"],
    availableCapacity: 1000,
    costPerUnit: 5,
    activationHours: 12,
    supportedLocations: ["Bengaluru FC"],
    qualityRequirements: null,
    ...overrides,
  };
}

export function makeData(overrides: Partial<BaseData>): BaseData {
  return {
    orders: [],
    products: [],
    tasks: [],
    workforce: [],
    inventory: [],
    providers: [],
    lastMile: [],
    dailyDemand: [],
    ...overrides,
  };
}

export const noOpScenario: Scenario = {
  id: "s1",
  name: "No changes",
  workforceAvailability: [],
  providerCapacityOverrides: [],
  materialAvailabilityOverrides: [],
  lastMileOverrides: [],
  demandShift: { essential: 1, everyday: 1, discretionary: 1 },
  locationDemand: [],
  recoveryResult: null,
};
