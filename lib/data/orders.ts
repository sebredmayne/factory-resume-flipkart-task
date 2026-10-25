import type { OrderInput } from "@/lib/types";

export const FULL_LINE = [
  "picking",
  "packing",
  "quality_inspection",
  "dispatch_coordination",
];

export const WITH_EXCEPTION_HANDLING = [
  "picking",
  "inventory_exceptions",
  "packing",
  "quality_inspection",
  "dispatch_coordination",
];

// The order backlog for a fictional personal-care and hygiene brand,
// "Fernwell", the morning after the disruption. Quantities are pending units
// across all channels. Priority isn't stored here — the engine derives it
// from each SKU's essentiality and the due date. Several discretionary
// orders are due earliest on purpose: a first-due-first-shipped floor would
// spend scarce capacity on them before essentials.
export const orders: OrderInput[] = [
  {
    id: "ORD-001",
    sku: "FW-SHMP-250",
    quantity: 900,
    dueAt: "2026-10-26",
    location: "Bengaluru FC",
    requiredProcessingSteps: FULL_LINE,
    unitValue: 299,
  },
  {
    id: "ORD-002",
    sku: "FW-HANDWASH-250",
    quantity: 800,
    dueAt: "2026-10-27",
    location: "Bengaluru FC",
    requiredProcessingSteps: FULL_LINE,
    unitValue: 149,
  },
  {
    id: "ORD-003",
    sku: "FW-SERUM-30",
    quantity: 450,
    dueAt: "2026-10-26",
    location: "Bengaluru FC",
    requiredProcessingSteps: FULL_LINE,
    unitValue: 799,
  },
  {
    id: "ORD-004",
    sku: "FW-SANITISER-500",
    quantity: 600,
    dueAt: "2026-10-27",
    location: "Pune FC",
    requiredProcessingSteps: WITH_EXCEPTION_HANDLING,
    unitValue: 249,
  },
  {
    id: "ORD-005",
    sku: "FW-PADS-30",
    quantity: 700,
    dueAt: "2026-10-28",
    location: "Bengaluru FC",
    requiredProcessingSteps: FULL_LINE,
    unitValue: 199,
  },
  {
    id: "ORD-006",
    sku: "FW-BODYLOTION-200",
    quantity: 500,
    dueAt: "2026-10-27",
    location: "Pune FC",
    requiredProcessingSteps: FULL_LINE,
    unitValue: 399,
  },
  {
    id: "ORD-007",
    sku: "FW-BABYWIPES-80",
    quantity: 500,
    dueAt: "2026-10-28",
    location: "Pune FC",
    requiredProcessingSteps: FULL_LINE,
    unitValue: 179,
  },
  {
    id: "ORD-008",
    sku: "FW-LIPBALM-10",
    quantity: 900,
    dueAt: "2026-10-26",
    location: "Bengaluru FC",
    requiredProcessingSteps: FULL_LINE,
    unitValue: 149,
  },
  {
    id: "ORD-009",
    sku: "FW-SOAP-4PK",
    quantity: 650,
    dueAt: "2026-10-29",
    location: "Bengaluru FC",
    requiredProcessingSteps: FULL_LINE,
    unitValue: 189,
  },
  {
    id: "ORD-010",
    sku: "FW-FACEWASH-100",
    quantity: 400,
    dueAt: "2026-10-28",
    location: "Pune FC",
    requiredProcessingSteps: WITH_EXCEPTION_HANDLING,
    unitValue: 279,
  },
  {
    id: "ORD-011",
    sku: "FW-SCRUB-100",
    quantity: 300,
    dueAt: "2026-10-29",
    location: "Pune FC",
    requiredProcessingSteps: FULL_LINE,
    unitValue: 349,
  },
];
