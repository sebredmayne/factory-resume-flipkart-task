import type { InventoryItem } from "@/lib/types";

// Usable inventory = availableQuantity - reservedQuantity.
// A few SKUs are intentionally short of their pending order quantity
// (see orders.ts) to exercise material-constrained recovery planning.
export const inventory: InventoryItem[] = [
  {
    sku: "FW-SHMP-250",
    availableQuantity: 1500,
    reservedQuantity: 200,
    location: "Bengaluru FC",
    replenishmentETA: null,
  },
  {
    sku: "FW-SERUM-30",
    availableQuantity: 500,
    reservedQuantity: 100,
    location: "Bengaluru FC",
    replenishmentETA: "2026-10-27",
  },
  {
    sku: "FW-FACEWASH-100",
    availableQuantity: 1000,
    reservedQuantity: 50,
    location: "Bengaluru FC",
    replenishmentETA: null,
  },
  {
    sku: "FW-SUNSCRN-50",
    availableQuantity: 600,
    reservedQuantity: 50,
    location: "Pune FC",
    replenishmentETA: "2026-10-29",
  },
  {
    sku: "FW-BODYLOTION-200",
    availableQuantity: 700,
    reservedQuantity: 100,
    location: "Pune FC",
    replenishmentETA: null,
  },
  {
    sku: "FW-HAIRIOL-100",
    availableQuantity: 550,
    reservedQuantity: 50,
    location: "Bengaluru FC",
    replenishmentETA: null,
  },
  {
    sku: "FW-COND-250",
    availableQuantity: 900,
    reservedQuantity: 150,
    location: "Bengaluru FC",
    replenishmentETA: "2026-10-30",
  },
  {
    sku: "FW-TONER-100",
    availableQuantity: 400,
    reservedQuantity: 50,
    location: "Pune FC",
    replenishmentETA: "2026-11-01",
  },
  {
    sku: "FW-LIPBALM-10",
    availableQuantity: 2000,
    reservedQuantity: 300,
    location: "Bengaluru FC",
    replenishmentETA: null,
  },
  {
    sku: "FW-SCRUB-100",
    availableQuantity: 450,
    reservedQuantity: 50,
    location: "Pune FC",
    replenishmentETA: "2026-11-02",
  },
];
