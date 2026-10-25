import type { InventoryItem } from "@/lib/types";

// Usable inventory = availableQuantity - reservedQuantity. Replenishments
// land on their ETA and are picked up by the daily loop. A few essentials
// are deliberately tight against backlog plus new demand, to exercise
// material-constrained planning.
export const inventory: InventoryItem[] = [
  { sku: "FW-HANDWASH-250", availableQuantity: 2200, reservedQuantity: 100, location: "Bengaluru FC", replenishmentETA: "2026-10-27", replenishmentQuantity: 1500 },
  { sku: "FW-SOAP-4PK", availableQuantity: 1800, reservedQuantity: 50, location: "Bengaluru FC", replenishmentETA: null, replenishmentQuantity: 0 },
  { sku: "FW-SANITISER-500", availableQuantity: 900, reservedQuantity: 100, location: "Pune FC", replenishmentETA: "2026-10-26", replenishmentQuantity: 1200 },
  { sku: "FW-PADS-30", availableQuantity: 1500, reservedQuantity: 0, location: "Bengaluru FC", replenishmentETA: "2026-10-28", replenishmentQuantity: 1000 },
  { sku: "FW-BABYWIPES-80", availableQuantity: 700, reservedQuantity: 100, location: "Pune FC", replenishmentETA: "2026-10-27", replenishmentQuantity: 800 },
  { sku: "FW-SHMP-250", availableQuantity: 2000, reservedQuantity: 200, location: "Bengaluru FC", replenishmentETA: null, replenishmentQuantity: 0 },
  { sku: "FW-FACEWASH-100", availableQuantity: 900, reservedQuantity: 50, location: "Pune FC", replenishmentETA: null, replenishmentQuantity: 0 },
  { sku: "FW-BODYLOTION-200", availableQuantity: 800, reservedQuantity: 100, location: "Pune FC", replenishmentETA: null, replenishmentQuantity: 0 },
  { sku: "FW-SERUM-30", availableQuantity: 600, reservedQuantity: 50, location: "Bengaluru FC", replenishmentETA: null, replenishmentQuantity: 0 },
  { sku: "FW-LIPBALM-10", availableQuantity: 1500, reservedQuantity: 100, location: "Bengaluru FC", replenishmentETA: null, replenishmentQuantity: 0 },
  { sku: "FW-SCRUB-100", availableQuantity: 400, reservedQuantity: 50, location: "Pune FC", replenishmentETA: null, replenishmentQuantity: 0 },
];
