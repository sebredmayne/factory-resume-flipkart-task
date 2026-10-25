import type { WorkforceGroup } from "@/lib/types";

// Post-disruption headcount. The disruption hit departments unevenly —
// management protected Quality Inspection and Inventory Exceptions
// (safety/compliance-critical and non-outsourceable) while Picking and
// Packing absorbed most of the cuts, since that capacity can partly be
// backfilled by external partners.
export const workforce: WorkforceGroup[] = [
  {
    skill: "picking",
    availableWorkers: 17,
    hoursPerShift: 8,
    productivityPerHour: 25,
    qualification: "Certified Picker L1",
    taskEligibility: ["picking"],
  },
  {
    skill: "packing",
    availableWorkers: 16,
    hoursPerShift: 8,
    productivityPerHour: 25,
    qualification: "Packing & Labelling Certification",
    taskEligibility: ["packing"],
  },
  {
    skill: "quality_inspection",
    availableWorkers: 15,
    hoursPerShift: 8,
    productivityPerHour: 35,
    qualification: "QA Inspector Certification",
    taskEligibility: ["quality_inspection"],
  },
  {
    skill: "inventory_exceptions",
    availableWorkers: 5,
    hoursPerShift: 8,
    productivityPerHour: 16,
    qualification: "Inventory Systems Certification",
    taskEligibility: ["inventory_exceptions"],
  },
  {
    skill: "dispatch_coordination",
    availableWorkers: 11,
    hoursPerShift: 8,
    productivityPerHour: 40,
    qualification: "Dispatch Operations Certification",
    taskEligibility: ["dispatch_coordination"],
  },
];
