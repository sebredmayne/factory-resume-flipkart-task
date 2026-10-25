import { describe, expect, it } from "vitest";
import { derivePriority, prioritiseOrders } from "@/lib/engine/priority";

const today = "2026-10-25";

describe("derivePriority", () => {
  it("never ranks an essential below high, and escalates it when due within a day", () => {
    expect(derivePriority("essential", "2026-10-29", today).priority).toBe("high");
    expect(derivePriority("essential", "2026-10-26", today).priority).toBe("critical");
  });

  it("escalates everyday items only when they're about to miss their date", () => {
    expect(derivePriority("everyday", "2026-10-29", today).priority).toBe("standard");
    expect(derivePriority("everyday", "2026-10-26", today).priority).toBe("high");
  });

  it("keeps discretionary items lowest even when overdue", () => {
    const result = derivePriority("discretionary", "2026-10-23", today);
    expect(result.priority).toBe("low");
    expect(result.priorityReason).toBe("Discretionary · 2d overdue");
  });

  it("re-ranks the same order as days pass", () => {
    const [early] = prioritiseOrders(
      [{ id: "o1", sku: "S1", quantity: 1, dueAt: "2026-10-28", location: "L", requiredProcessingSteps: [], unitValue: 1 }],
      [{ sku: "S1", name: "S1", essentiality: "essential" }],
      today
    );
    const [late] = prioritiseOrders(
      [{ id: "o1", sku: "S1", quantity: 1, dueAt: "2026-10-28", location: "L", requiredProcessingSteps: [], unitValue: 1 }],
      [{ sku: "S1", name: "S1", essentiality: "essential" }],
      "2026-10-27"
    );
    expect(early.priority).toBe("high");
    expect(late.priority).toBe("critical");
  });
});
