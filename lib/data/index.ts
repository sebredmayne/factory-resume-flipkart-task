import type { Scenario } from "@/lib/types";

export { orders } from "@/lib/data/orders";
export { workforce } from "@/lib/data/workforce";
export { tasks } from "@/lib/data/tasks";
export { inventory } from "@/lib/data/inventory";
export { providers } from "@/lib/data/providers";

// The starting point before any what-if changes are applied.
export const baselineScenario: Scenario = {
  id: "baseline",
  name: "Current state (post-disruption)",
  workforceAvailability: [],
  providerCapacityOverrides: [],
  demandMultiplier: 1,
  materialAvailabilityOverrides: [],
  recoveryResult: null,
};
