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

const ESSENTIALITY_LABEL: Record<string, string> = {
  essential: "Essential",
  everyday: "Everyday",
  discretionary: "Discretionary",
};

export function formatEssentiality(essentiality: string): string {
  return ESSENTIALITY_LABEL[essentiality] ?? essentiality;
}

const LIMITING_FACTOR_LABEL: Record<string, string> = {
  capacity: "Capacity",
  inventory: "Inventory",
  last_mile: "Last mile",
  none: "—",
};

export function formatLimitingFactor(factor: string): string {
  return LIMITING_FACTOR_LABEL[factor] ?? factor;
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

// Day indexes are 0-based in the engine; managers count from Day 1.
export function formatDay(dayIndex: number): string {
  return `Day ${dayIndex + 1}`;
}
