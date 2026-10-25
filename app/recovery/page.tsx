import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlanSummary } from "@/components/recovery/plan-summary";
import { ApprovePlanButton } from "@/components/recovery/approve-plan-button";
import { baseData, baselineScenario, SCENARIO_TODAY } from "@/lib/data";
import { generateRecoveryPlan } from "@/lib/engine";
import { formatCurrency, formatDay, formatNumber } from "@/lib/format";

export default function RecoveryPage() {
  const plan = generateRecoveryPlan(baselineScenario, baseData, SCENARIO_TODAY);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Recovery plan — {formatDay(plan.dayIndex)}
          </h1>
          <p className="text-muted-foreground">
            Combines staffing, redeployment, partners and needs-based priority
            into one feasible plan for today. Orders are ranked by what&apos;s
            in the box first, then by due date; each row says why.
          </p>
        </div>
        <ApprovePlanButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{baselineScenario.name}</CardTitle>
          <CardDescription>
            {formatNumber(plan.internalAllocations.reduce((s, a) => s + a.allocatedWorkers, 0))}{" "}
            workers allocated ({formatNumber(plan.redeployments.reduce((s, r) => s + r.workers, 0))}{" "}
            redeployed) ·{" "}
            {formatNumber(plan.outsourcedVolumes.reduce((s, r) => s + r.recommendedVolume, 0))}{" "}
            units outsourced across {plan.outsourcedVolumes.length} engagements
            ({formatCurrency(plan.incrementalCost)}) ·{" "}
            {new Set(plan.providerRequests.map((r) => r.providerId)).size} partners
            to request today for later days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlanSummary plan={plan} />
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        This plan is rebuilt every morning. Run it forward in{" "}
        <Link href="/today" className="font-medium text-foreground hover:underline">
          Daily loop
        </Link>
        , or stress-test the next five days in{" "}
        <Link href="/scenarios" className="font-medium text-foreground hover:underline">
          Scenarios
        </Link>
        .
      </p>
    </div>
  );
}
