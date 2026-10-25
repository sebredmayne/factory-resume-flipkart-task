import type { Task } from "@/lib/types";

// Fictional fulfilment workflow for a personal-care and hygiene brand.
// Picking -> Packing -> Quality Inspection -> Dispatch Coordination,
// with Inventory Exceptions running in parallel as needed.
export const tasks: Task[] = [
  {
    id: "picking",
    name: "Picking",
    labourHoursPerUnit: 0.04,
    requiredSkill: "picking",
    maxThroughput: 4000,
    prerequisites: [],
    outsourcingEligible: true,
    crossTrainingAllowed: true,
  },
  {
    id: "packing",
    name: "Packing & Labelling",
    labourHoursPerUnit: 0.04,
    requiredSkill: "packing",
    maxThroughput: 3600,
    prerequisites: ["picking"],
    outsourcingEligible: true,
    crossTrainingAllowed: true,
  },
  {
    id: "quality_inspection",
    name: "Quality Inspection",
    labourHoursPerUnit: 0.03,
    requiredSkill: "quality_inspection",
    maxThroughput: 5000,
    prerequisites: ["packing"],
    outsourcingEligible: false,
    crossTrainingAllowed: false,
  },
  {
    id: "inventory_exceptions",
    name: "Inventory Exceptions",
    labourHoursPerUnit: 0.0625,
    requiredSkill: "inventory_exceptions",
    maxThroughput: 500,
    prerequisites: [],
    outsourcingEligible: false,
    crossTrainingAllowed: false,
  },
  {
    id: "dispatch_coordination",
    name: "Dispatch Coordination",
    labourHoursPerUnit: 0.025,
    requiredSkill: "dispatch_coordination",
    maxThroughput: 6000,
    prerequisites: ["quality_inspection"],
    outsourcingEligible: true,
    crossTrainingAllowed: true,
  },
];
