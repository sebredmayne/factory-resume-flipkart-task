import type { Product } from "@/lib/types";

// Fernwell's catalogue, tagged by how much each product matters to a
// household when supply is scarce. The tag is an operator policy input —
// the engine ranks by it, it never invents it.
export const products: Product[] = [
  { sku: "FW-HANDWASH-250", name: "Hand wash 250ml", essentiality: "essential" },
  { sku: "FW-SOAP-4PK", name: "Bath soap, 4-pack", essentiality: "essential" },
  { sku: "FW-SANITISER-500", name: "Hand sanitiser 500ml", essentiality: "essential" },
  { sku: "FW-PADS-30", name: "Sanitary pads, 30", essentiality: "essential" },
  { sku: "FW-BABYWIPES-80", name: "Baby wipes, 80", essentiality: "essential" },
  { sku: "FW-SHMP-250", name: "Shampoo 250ml", essentiality: "everyday" },
  { sku: "FW-FACEWASH-100", name: "Face wash 100ml", essentiality: "everyday" },
  { sku: "FW-BODYLOTION-200", name: "Body lotion 200ml", essentiality: "everyday" },
  { sku: "FW-SERUM-30", name: "Face serum 30ml", essentiality: "discretionary" },
  { sku: "FW-LIPBALM-10", name: "Lip balm 10g", essentiality: "discretionary" },
  { sku: "FW-SCRUB-100", name: "Body scrub 100g", essentiality: "discretionary" },
];
