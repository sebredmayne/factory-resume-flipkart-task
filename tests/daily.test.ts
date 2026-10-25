import { describe, expect, it } from "vitest";
import {
  closeDay,
  initialDayState,
  planDay,
  plannedTaskUnits,
  projectOutlook,
} from "@/lib/engine/daily";
import { baseData, baselineScenario, SCENARIO_TODAY } from "@/lib/data";

describe("daily loop — closing a day", () => {
  const state0 = initialDayState(baseData, baselineScenario, SCENARIO_TODAY);
  const plan0 = planDay(state0, baseData, baselineScenario);

  it("rolls unshipped orders over, adds the day's new orders, and advances the date", () => {
    const state1 = closeDay(state0, plan0, baseData, baselineScenario);
    const record = state1.history[0];

    expect(state1.dayIndex).toBe(1);
    expect(state1.date).toBe("2026-10-26");
    expect(record.actualUnits).toBe(plan0.totalExpectedFulfilment);
    expect(record.planAccuracy).toBe(1);
    expect(record.newOrderUnits).toBeGreaterThan(0);

    const startUnits = state0.backlog.reduce((s, o) => s + o.quantity, 0);
    expect(record.backlogEndUnits).toBe(startUnits - record.actualUnits + record.newOrderUnits);
  });

  it("scales new orders by the scenario's demand shift", () => {
    const quieter = { ...baselineScenario, demandShift: { essential: 0.45, everyday: 0.25, discretionary: 0.1 } };
    const normal = closeDay(state0, plan0, baseData, baselineScenario).history[0].newOrderUnits;
    const halved = closeDay(state0, plan0, baseData, quieter).history[0].newOrderUnits;
    expect(halved).toBeCloseTo(normal / 2, -1);
  });

  it("brings partners requested today online tomorrow", () => {
    expect(plan0.outsourcedVolumes.some((r) => r.providerId === "quickpack")).toBe(false);
    expect(plan0.providerRequests.some((r) => r.providerId === "quickpack")).toBe(true);

    const state1 = closeDay(state0, plan0, baseData, baselineScenario);
    const plan1 = planDay(state1, baseData, baselineScenario);
    expect(plan1.outsourcedVolumes.some((r) => r.providerId === "quickpack")).toBe(true);
  });

  it("measures plan accuracy from actuals and recalibrates the next day's capacity", () => {
    const planned = plannedTaskUnits(plan0);
    const actuals = { ...planned, packing: Math.round(planned.packing * 0.8) };

    const state1 = closeDay(state0, plan0, baseData, baselineScenario, actuals);

    expect(state1.history[0].planAccuracy).toBeCloseTo(0.8, 1);
    expect(state1.calibration.packing).toBeCloseTo(0.9, 2); // halfway to 0.8
    expect(state1.calibration.picking).toBe(1);

    const planWithCalibration = planDay(state1, baseData, baselineScenario);
    const planWithout = planDay({ ...state1, calibration: {} }, baseData, baselineScenario);
    const packCap = (p: typeof planWithout) =>
      p.internalAllocations.find((a) => a.taskId === "packing")!.resultingCapacity;
    // Redeployment partly compensates, but the floor's real pace is planned for.
    expect(packCap(planWithCalibration)).toBeLessThanOrEqual(packCap(planWithout));
  });
});

describe("daily loop — outlook", () => {
  it("protects essentials far better than business as usual over five days", () => {
    const managed = projectOutlook(baseData, baselineScenario, SCENARIO_TODAY, 5, "managed").summary;
    const unmanaged = projectOutlook(baseData, baselineScenario, SCENARIO_TODAY, 5, "unmanaged").summary;

    expect(managed.essentialOnTimeRate).toBeGreaterThan(unmanaged.essentialOnTimeRate + 0.2);
    expect(managed.shippedUnits).toBeGreaterThan(unmanaged.shippedUnits);
    expect(managed.endBacklogUnits).toBeLessThan(unmanaged.endBacklogUnits);
  });
});
