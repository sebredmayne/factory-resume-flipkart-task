import type { DailyDemand } from "@/lib/types";
import { FULL_LINE, WITH_EXCEPTION_HANDLING } from "@/lib/data/orders";

// Pre-disruption daily order intake. The daily loop scales this by the
// scenario's demand shift to generate each day's new orders, so "half the
// customers are gone" and "essentials are being stockpiled" are both
// explicit inputs rather than buried in the backlog.
export const dailyDemand: DailyDemand[] = [
  { sku: "FW-HANDWASH-250", location: "Bengaluru FC", unitsPerDay: 500, requiredProcessingSteps: FULL_LINE, unitValue: 149, dueInDays: 2 },
  { sku: "FW-SOAP-4PK", location: "Bengaluru FC", unitsPerDay: 400, requiredProcessingSteps: FULL_LINE, unitValue: 189, dueInDays: 2 },
  { sku: "FW-SANITISER-500", location: "Pune FC", unitsPerDay: 300, requiredProcessingSteps: WITH_EXCEPTION_HANDLING, unitValue: 249, dueInDays: 2 },
  { sku: "FW-PADS-30", location: "Bengaluru FC", unitsPerDay: 400, requiredProcessingSteps: FULL_LINE, unitValue: 199, dueInDays: 2 },
  { sku: "FW-BABYWIPES-80", location: "Pune FC", unitsPerDay: 300, requiredProcessingSteps: FULL_LINE, unitValue: 179, dueInDays: 2 },
  { sku: "FW-SHMP-250", location: "Bengaluru FC", unitsPerDay: 600, requiredProcessingSteps: FULL_LINE, unitValue: 299, dueInDays: 2 },
  { sku: "FW-FACEWASH-100", location: "Pune FC", unitsPerDay: 400, requiredProcessingSteps: FULL_LINE, unitValue: 279, dueInDays: 2 },
  { sku: "FW-BODYLOTION-200", location: "Pune FC", unitsPerDay: 300, requiredProcessingSteps: FULL_LINE, unitValue: 399, dueInDays: 2 },
  { sku: "FW-SERUM-30", location: "Bengaluru FC", unitsPerDay: 400, requiredProcessingSteps: FULL_LINE, unitValue: 799, dueInDays: 2 },
  { sku: "FW-LIPBALM-10", location: "Bengaluru FC", unitsPerDay: 600, requiredProcessingSteps: FULL_LINE, unitValue: 149, dueInDays: 2 },
  { sku: "FW-SCRUB-100", location: "Pune FC", unitsPerDay: 300, requiredProcessingSteps: FULL_LINE, unitValue: 349, dueInDays: 2 },
];
