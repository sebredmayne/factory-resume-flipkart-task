import type { WorkforceGroup } from "@/lib/types";

// Post-disruption headcount: roughly 50% of the normal ~64-person
// fulfilment team survived the disruption (32 remaining).
export const workforce: WorkforceGroup[] = [
  {
    skill: "picking",
    availableWorkers: 12,
    hoursPerShift: 8,
    productivityPerHour: 25,
    qualification: "Certified Picker L1",
    taskEligibility: ["picking"],
  },
  {
    skill: "packing",
    availableWorkers: 10,
    hoursPerShift: 8,
    productivityPerHour: 18,
    qualification: "Packing & Labelling Certification",
    taskEligibility: ["packing"],
  },
  {
    skill: "quality_inspection",
    availableWorkers: 4,
    hoursPerShift: 8,
    productivityPerHour: 30,
    qualification: "QA Inspector Certification",
    taskEligibility: ["quality_inspection"],
  },
  {
    skill: "inventory_exceptions",
    availableWorkers: 3,
    hoursPerShift: 8,
    productivityPerHour: 8,
    qualification: "Inventory Systems Certification",
    taskEligibility: ["inventory_exceptions"],
  },
  {
    skill: "dispatch_coordination",
    availableWorkers: 3,
    hoursPerShift: 8,
    productivityPerHour: 40,
    qualification: "Dispatch Operations Certification",
    taskEligibility: ["dispatch_coordination"],
  },
];
