import type { WorkforceGroup } from "@/lib/types";

// Post-disruption headcount: 60 of a normal ~120. The loss hit teams
// unevenly — packing lost the most people, picking the fewest — so the
// people who are left are the wrong mix for the work. Cross-skills record
// who can cover what, at what speed, after how much on-the-job ramp-up.
// Quality Inspection and Inventory Exceptions need certification, so no one
// can be cross-trained into them.
export const workforce: WorkforceGroup[] = [
  {
    id: "pickers",
    skill: "picking",
    availableWorkers: 22,
    hoursPerShift: 8,
    productivityPerHour: 25,
    qualification: "Certified Picker L1",
    taskEligibility: ["picking"],
    crossSkills: [
      { taskId: "packing", productivityFactor: 0.6, rampUpHours: 2 },
      { taskId: "dispatch_coordination", productivityFactor: 0.5, rampUpHours: 1 },
    ],
  },
  {
    id: "packers",
    skill: "packing",
    availableWorkers: 11,
    hoursPerShift: 8,
    productivityPerHour: 25,
    qualification: "Packing & Labelling Certification",
    taskEligibility: ["packing"],
    crossSkills: [
      { taskId: "picking", productivityFactor: 0.8, rampUpHours: 1 },
    ],
  },
  {
    id: "qa-inspectors",
    skill: "quality_inspection",
    availableWorkers: 13,
    hoursPerShift: 8,
    productivityPerHour: 35,
    qualification: "QA Inspector Certification",
    taskEligibility: ["quality_inspection"],
    crossSkills: [],
  },
  {
    id: "inventory-team",
    skill: "inventory_exceptions",
    availableWorkers: 4,
    hoursPerShift: 8,
    productivityPerHour: 16,
    qualification: "Inventory Systems Certification",
    taskEligibility: ["inventory_exceptions"],
    crossSkills: [],
  },
  {
    id: "dispatch-team",
    skill: "dispatch_coordination",
    availableWorkers: 10,
    hoursPerShift: 8,
    productivityPerHour: 40,
    qualification: "Dispatch Operations Certification",
    taskEligibility: ["dispatch_coordination"],
    crossSkills: [
      { taskId: "packing", productivityFactor: 0.5, rampUpHours: 2 },
      { taskId: "picking", productivityFactor: 0.7, rampUpHours: 1 },
    ],
  },
];
