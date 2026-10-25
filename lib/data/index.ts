import type { Scenario } from "@/lib/types";

export { orders } from "@/lib/data/orders";
export { products } from "@/lib/data/products";
export { workforce } from "@/lib/data/workforce";
export { tasks } from "@/lib/data/tasks";
export { inventory } from "@/lib/data/inventory";
export { providers } from "@/lib/data/providers";
export { lastMile } from "@/lib/data/last-mile";
export { dailyDemand } from "@/lib/data/demand";

// Frozen "today" for this fictional scenario — the morning after the
// disruption — so due-date urgency stays meaningful regardless of when the
// app is actually run.
export const SCENARIO_TODAY = "2026-10-25";

// The starting point before any what-if changes are applied. Demand shift
// is relative to pre-disruption intake: half the customers are gone, and
// the ones left are stockpiling essentials (0.5 x 1.8 = 0.9) while cutting
// back on everything else.
export const baselineScenario: Scenario = {
  id: "baseline",
  name: "Day after (post-disruption)",
  workforceAvailability: [],
  providerCapacityOverrides: [],
  materialAvailabilityOverrides: [],
  lastMileOverrides: [],
  demandShift: { essential: 0.9, everyday: 0.5, discretionary: 0.2 },
  locationDemand: [],
  recoveryResult: null,
};

import type { BaseData } from "@/lib/engine/recovery";
import { orders } from "@/lib/data/orders";
import { products } from "@/lib/data/products";
import { workforce } from "@/lib/data/workforce";
import { tasks } from "@/lib/data/tasks";
import { inventory } from "@/lib/data/inventory";
import { providers } from "@/lib/data/providers";
import { lastMile } from "@/lib/data/last-mile";
import { dailyDemand } from "@/lib/data/demand";

// Everything the engine plans against, bundled for convenience.
export const baseData: BaseData = {
  orders,
  products,
  tasks,
  workforce,
  inventory,
  providers,
  lastMile,
  dailyDemand,
};
