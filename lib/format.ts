export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

const PRIORITY_LABEL: Record<string, string> = {
  critical: "Critical",
  high: "High",
  standard: "Standard",
  low: "Low",
};

export function formatPriority(priority: string): string {
  return PRIORITY_LABEL[priority] ?? priority;
}

const SKILL_LABEL: Record<string, string> = {
  picking: "Picking",
  packing: "Packing & Labelling",
  quality_inspection: "Quality Inspection",
  inventory_exceptions: "Inventory Exceptions",
  dispatch_coordination: "Dispatch Coordination",
};

export function formatSkill(skill: string): string {
  return SKILL_LABEL[skill] ?? skill;
}
