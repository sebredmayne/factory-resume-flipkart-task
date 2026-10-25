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
import {
  orders,
  workforce,
  tasks,
  inventory,
  providers,
  baselineScenario,
  SCENARIO_TODAY,
} from "@/lib/data";
import { generateRecoveryPlan, type BaseData } from "@/lib/engine";
import { formatNumber } from "@/lib/format";

export default function RecoveryPage() {
  const data: BaseData = { orders, tasks, workforce, inventory, providers };
  const plan = generateRecoveryPlan(baselineScenario, data, SCENARIO_TODAY);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Recovery plan
          </h1>
          <p className="text-muted-foreground">
            Combines internal staffing, outsourcing, and order priorities
            into a single feasible plan for {baselineScenario.name.toLowerCase()}.
          </p>
        </div>
        <ApprovePlanButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{baselineScenario.name}</CardTitle>
          <CardDescription>
            {formatNumber(plan.internalAllocations.reduce((s, a) => s + a.allocatedWorkers, 0))}{" "}
            workers allocated internally ·{" "}
            {formatNumber(plan.outsourcedVolumes.reduce((s, r) => s + r.recommendedVolume, 0))}{" "}
            units outsourced across {plan.outsourcedVolumes.length} engagements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlanSummary plan={plan} orders={orders} />
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Want to see how this changes under a disruption? Head to{" "}
        <Link href="/scenarios" className="font-medium text-foreground hover:underline">
          Scenarios
        </Link>{" "}
        to simulate workforce loss, provider outages, demand spikes, or
        material delays.
      </p>
    </div>
  );
}
