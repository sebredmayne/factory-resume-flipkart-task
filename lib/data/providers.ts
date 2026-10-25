import type { ExternalProvider } from "@/lib/types";

export const providers: ExternalProvider[] = [
  {
    id: "quickpack",
    name: "QuickPack Fulfilment Partners",
    services: ["packing"],
    availableCapacity: 800,
    costPerUnit: 9.5,
    activationHours: 24,
    supportedLocations: ["Bengaluru FC"],
    qualityRequirements: "Must maintain under 0.5% mislabel rate",
  },
  {
    id: "rapidpick",
    name: "RapidPick Logistics",
    services: ["picking"],
    availableCapacity: 1000,
    costPerUnit: 6,
    activationHours: 12,
    supportedLocations: ["Bengaluru FC", "Pune FC"],
    qualityRequirements: null,
  },
  {
    id: "swiftdispatch",
    name: "SwiftDispatch Couriers",
    services: ["dispatch_coordination"],
    availableCapacity: 2000,
    costPerUnit: 4,
    activationHours: 6,
    supportedLocations: ["Bengaluru FC", "Pune FC"],
    qualityRequirements: "SLA: dispatch within 4 hours of handoff",
  },
  {
    id: "valleyworks",
    name: "ValleyWorks Co-pack",
    services: ["picking", "packing"],
    availableCapacity: 600,
    costPerUnit: 11,
    activationHours: 48,
    supportedLocations: ["Pune FC"],
    qualityRequirements: "ISO 9001 certified facility",
  },
];
