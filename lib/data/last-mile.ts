import type { LastMileLane } from "@/lib/types";

// Courier capacity out of each fulfilment centre after the disruption —
// roughly half of normal, since couriers were hit too.
export const lastMile: LastMileLane[] = [
  { location: "Bengaluru FC", carrier: "LaneOne Couriers", capacityPerDay: 2600 },
  { location: "Pune FC", carrier: "Deccan Last Mile", capacityPerDay: 1100 },
];
