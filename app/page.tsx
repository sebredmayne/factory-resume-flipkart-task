import Link from "next/link";
import { AlertTriangle, ArrowRight, Package, ShieldCheck, Shuffle, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EssentialityBadge } from "@/components/recovery/plan-summary";
import {
  baseData,
  tasks,
  workforce,
  baselineScenario,
  SCENARIO_TODAY,
} from "@/lib/data";
import {
  bindingConstraint,
  projectOutlook,
  taskDemandVolume,
} from "@/lib/engine";
import {
  formatCurrency,
  formatDate,
  formatDay,
  formatLimitingFactor,
  formatNumber,
  formatPercent,
} from "@/lib/format";

const OUTLOOK_DAYS = 5;

export default function OverviewPage() {
  const managed = projectOutlook(baseData, baselineScenario, SCENARIO_TODAY, OUTLOOK_DAYS);
  const unmanaged = projectOutlook(
    baseData,
    baselineScenario,
    SCENARIO_TODAY,
    OUTLOOK_DAYS,
    "unmanaged"
  );
  const plan = managed.plans[0];
  const unmanagedToday = unmanaged.plans[0];
  const orders = plan.orders;

  const totalUnitsPending = orders.reduce((sum, o) => sum + o.quantity, 0);
  const fulfilmentRatio = totalUnitsPending
    ? plan.totalExpectedFulfilment / totalUnitsPending
    : 0;
  const totalWorkersAvailable = workforce.reduce((sum, w) => sum + w.availableWorkers, 0);
  const redeployedWorkers = plan.redeployments.reduce((sum, r) => sum + r.workers, 0);
  const extraUnits = managed.summary.shippedUnits - unmanaged.summary.shippedUnits;

  const comparisonRows = [
    {
      metric: "Essential units shipped on time",
      plan: formatPercent(managed.summary.essentialOnTimeRate),
      bau: formatPercent(unmanaged.summary.essentialOnTimeRate),
      note: `of ${formatNumber(managed.summary.essentialDueUnits)} essential units due in the window`,
    },
    {
      metric: "Units shipped",
      plan: formatNumber(managed.summary.shippedUnits),
      bau: formatNumber(unmanaged.summary.shippedUnits),
      note: `+${formatNumber(extraUnits)} with the plan`,
    },
    {
      metric: `Backlog left after ${formatDay(OUTLOOK_DAYS - 1)}`,
      plan: formatNumber(managed.summary.endBacklogUnits),
      bau: formatNumber(unmanaged.summary.endBacklogUnits),
      note: "units still waiting",
    },
    {
      metric: "Outsourcing spend",
      plan: formatCurrency(managed.summary.cost),
      bau: formatCurrency(0),
      note:
        extraUnits > 0
          ? `${formatCurrency(managed.summary.cost / extraUnits)} per extra unit shipped`
          : "",
    },
  ];

  const atRiskOrders = plan.orderFulfilment
    .filter((f) => f.shortfall > 0)
    .map((f) => ({ fulfilment: f, order: orders.find((o) => o.id === f.orderId)! }))
    .filter(({ order }) => order.essentiality === "essential");

  const taskBreakdown = tasks.map((task) => {
    const allocation = plan.internalAllocations.find((a) => a.taskId === task.id)!;
    const outsourcedVolume = plan.outsourcedVolumes
      .filter((o) => o.taskId === task.id)
      .reduce((sum, o) => sum + o.recommendedVolume, 0);
    const demand = taskDemandVolume(task.id, orders);
    const achievable = allocation.resultingCapacity + outsourcedVolume;
    return { task, allocation, outsourcedVolume, demand, achievable, gap: Math.max(0, demand - achievable) };
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {formatDay(0)} after the disruption
        </h1>
        <p className="text-muted-foreground">
          Fernwell&apos;s fulfilment network has {totalWorkersAvailable} of its
          usual ~120 staff, half its courier capacity, and customers whose
          needs have shifted toward essentials. Today&apos;s plan,{" "}
          {formatDate(SCENARIO_TODAY)}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>The plan vs. business as usual — {OUTLOOK_DAYS}-day outlook</CardTitle>
          <CardDescription>
            &ldquo;Business as usual&rdquo; is what the floor does without a
            plan: everyone stays on their own task, no partners are brought in,
            and orders ship first-due-first. Both run through the same engine,
            on the same data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>With the plan</TableHead>
                <TableHead>Business as usual</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisonRows.map((row) => (
                <TableRow key={row.metric}>
                  <TableCell className="font-medium">{row.metric}</TableCell>
                  <TableCell className="font-semibold">{row.plan}</TableCell>
                  <TableCell className="text-muted-foreground">{row.bau}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{row.note}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ships today
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatPercent(fulfilmentRatio)}</div>
            <Progress value={Math.round(fulfilmentRatio * 100)} className="mt-2 h-1.5" />
            <p className="mt-2 text-xs text-muted-foreground">
              {formatNumber(plan.totalExpectedFulfilment)} of{" "}
              {formatNumber(totalUnitsPending)} units · business as usual ships{" "}
              {formatNumber(unmanagedToday.totalExpectedFulfilment)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Essentials shipped today
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {formatNumber(plan.essentialUnitsFulfilled)}
            </div>
            <p className="text-xs text-muted-foreground">
              of {formatNumber(plan.essentialUnitsRequested)} essential units pending ·
              business as usual ships {formatNumber(unmanagedToday.essentialUnitsFulfilled)}
            </p>
          </CardContent>
        </Card>

        <Link href="/workforce" className="block">
          <Card className="h-full transition-colors hover:border-foreground/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Workers redeployed
              </CardTitle>
              <Shuffle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {redeployedWorkers}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  of {totalWorkersAvailable}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Moved across tasks to balance the line — no packing partner can
                start before {formatDay(1)}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/today" className="block">
          <Card className="h-full transition-colors hover:border-foreground/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Today&apos;s bottleneck
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">
                {bindingConstraint(plan, tasks).label}
              </div>
              <p className="text-xs text-muted-foreground">
                Run the day in the daily loop →
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>The bottleneck moves — day by day</CardTitle>
          <CardDescription>
            The plan if each day executes as planned. The constraint
            that binds changes as partners come online and stock runs down,
            which is why the plan is rebuilt every morning rather than once.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead>Ships</TableHead>
                <TableHead>Essentials shipped</TableHead>
                <TableHead>Partners live</TableHead>
                <TableHead>Binding constraint</TableHead>
                <TableHead>Backlog at close</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {managed.plans.map((dayPlan, i) => {
                const record = managed.finalState.history[i];
                return (
                  <TableRow key={dayPlan.dayIndex}>
                    <TableCell className="font-medium">
                      {formatDay(dayPlan.dayIndex)}{" "}
                      <span className="text-muted-foreground">
                        · {formatDate(record.date)}
                      </span>
                    </TableCell>
                    <TableCell>{formatNumber(dayPlan.totalExpectedFulfilment)}</TableCell>
                    <TableCell>{formatNumber(dayPlan.essentialUnitsFulfilled)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {dayPlan.outsourcedVolumes.length > 0
                        ? [...new Set(dayPlan.outsourcedVolumes.map((r) => r.providerId))].length
                        : "None"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {bindingConstraint(dayPlan, tasks).label}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatNumber(record.backlogEndUnits)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Capacity breakdown by task — today</CardTitle>
          <CardDescription>
            Demand vs. what today&apos;s plan can deliver: own-skill staff,
            redeployed staff, and any partner live today.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Demand</TableHead>
                <TableHead>Workers (redeployed in)</TableHead>
                <TableHead>Internal capacity</TableHead>
                <TableHead>Outsourced</TableHead>
                <TableHead>Total achievable</TableHead>
                <TableHead>Gap</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taskBreakdown.map((row) => (
                <TableRow key={row.task.id}>
                  <TableCell className="font-medium">{row.task.name}</TableCell>
                  <TableCell>{formatNumber(row.demand)}</TableCell>
                  <TableCell>
                    {row.allocation.allocatedWorkers}
                    {row.allocation.redeployedInWorkers > 0 && (
                      <span className="text-muted-foreground">
                        {" "}(+{row.allocation.redeployedInWorkers})
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{formatNumber(row.allocation.resultingCapacity)}</TableCell>
                  <TableCell>
                    {row.outsourcedVolume > 0 ? formatNumber(row.outsourcedVolume) : "—"}
                  </TableCell>
                  <TableCell>{formatNumber(row.achievable)}</TableCell>
                  <TableCell>
                    {row.gap > 0 ? (
                      <Badge variant="destructive">{formatNumber(row.gap)}</Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Essential orders not fully shipping today</CardTitle>
            <CardDescription>
              Ranked by need, then due date — the order the engine uses to
              allocate scarce capacity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {atRiskOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Every essential order ships in full today.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Need</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Shortfall</TableHead>
                    <TableHead>Limiting factor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atRiskOrders.map(({ fulfilment, order }) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.id}</TableCell>
                      <TableCell>
                        <EssentialityBadge essentiality={order.essentiality} />
                      </TableCell>
                      <TableCell>{formatDate(order.dueAt)}</TableCell>
                      <TableCell>
                        {formatNumber(fulfilment.shortfall)} /{" "}
                        {formatNumber(fulfilment.requestedQuantity)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatLimitingFactor(fulfilment.limitingFactor)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Constraints and bottlenecks</CardTitle>
            <CardDescription>
              What the recovery engine flagged as infeasible or at its limit today.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 text-sm">
              {plan.constraintViolations.map((violation, i) => (
                <li key={i} className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <span>{violation}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/recovery"
              className="mt-4 flex items-center gap-1 text-sm font-medium text-foreground hover:underline"
            >
              View today&apos;s full plan <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
