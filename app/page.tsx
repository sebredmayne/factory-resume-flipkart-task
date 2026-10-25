import Link from "next/link";
import { AlertTriangle, ArrowRight, Package, Truck, Users } from "lucide-react";
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
import {
  orders,
  workforce,
  providers,
  tasks,
  inventory,
  baselineScenario,
  SCENARIO_TODAY,
} from "@/lib/data";
import { generateRecoveryPlan, taskDemandVolume, type BaseData } from "@/lib/engine";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPriority,
} from "@/lib/format";

const priorityVariant: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  critical: "destructive",
  high: "default",
  standard: "secondary",
  low: "outline",
};

const limitingFactorLabel: Record<string, string> = {
  capacity: "Capacity",
  inventory: "Inventory",
  none: "—",
};

export default function OverviewPage() {
  const data: BaseData = { orders, tasks, workforce, inventory, providers };
  const plan = generateRecoveryPlan(baselineScenario, data, SCENARIO_TODAY);

  const totalOrders = orders.length;
  const totalUnitsPending = orders.reduce((sum, o) => sum + o.quantity, 0);
  const totalOrderValue = orders.reduce(
    (sum, o) => sum + o.quantity * o.unitValue,
    0
  );
  const fulfilmentPercent = totalUnitsPending
    ? Math.round((plan.totalExpectedFulfilment / totalUnitsPending) * 100)
    : 0;

  const totalWorkersAvailable = workforce.reduce(
    (sum, w) => sum + w.availableWorkers,
    0
  );
  const totalStaffingShortfall = plan.workforceRequirements.reduce(
    (sum, r) => sum + r.staffingShortfall,
    0
  );

  const totalOutsourcingCapacity = providers.reduce(
    (sum, p) => sum + p.availableCapacity,
    0
  );

  const atRiskOrders = plan.orderFulfilment
    .filter((f) => f.shortfall > 0)
    .map((f) => ({
      fulfilment: f,
      order: orders.find((o) => o.id === f.orderId)!,
    }));

  const taskBreakdown = tasks.map((task) => {
    const requirement = plan.workforceRequirements.find(
      (r) => r.taskId === task.id
    )!;
    const allocation = plan.internalAllocations.find(
      (a) => a.taskId === task.id
    )!;
    const outsourcedVolume = plan.outsourcedVolumes
      .filter((o) => o.taskId === task.id)
      .reduce((sum, o) => sum + o.recommendedVolume, 0);
    const demand = taskDemandVolume(task.id, orders);
    const achievable = allocation.resultingCapacity + outsourcedVolume;
    const gap = Math.max(0, demand - achievable);

    return { task, requirement, allocation, outsourcedVolume, demand, achievable, gap };
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Operations overview
        </h1>
        <p className="text-muted-foreground">
          Fernwell fulfilment centre — recovery plan for{" "}
          {baselineScenario.name.toLowerCase()}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Orders pending
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(totalUnitsPending)} units ·{" "}
              {formatCurrency(totalOrderValue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Projected fulfilment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{fulfilmentPercent}%</div>
            <Progress value={fulfilmentPercent} className="mt-2 h-1.5" />
            <p className="mt-2 text-xs text-muted-foreground">
              {formatNumber(plan.unfulfilledDemand)} units unfulfilled under
              the current plan
            </p>
          </CardContent>
        </Card>

        <Link href="/workforce" className="block">
          <Card className="h-full transition-colors hover:border-foreground/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Workforce available
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {totalWorkersAvailable}
              </div>
              <p className="text-xs text-muted-foreground">
                {totalStaffingShortfall > 0
                  ? `${totalStaffingShortfall} more workers would be needed to fully staff every task`
                  : "Fully staffed for current demand"}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/outsourcing" className="block">
          <Card className="h-full transition-colors hover:border-foreground/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Outsourcing capacity
              </CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {formatNumber(totalOutsourcingCapacity)}
              </div>
              <p className="text-xs text-muted-foreground">
                units/day · {formatCurrency(plan.incrementalCost)} recommended
                spend
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/recovery" className="block">
          <Card className="h-full transition-colors hover:border-foreground/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Orders at risk
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {plan.ordersAtRisk.length}
              </div>
              <p className="text-xs text-muted-foreground">
                of {totalOrders} orders won&apos;t fully ship under this plan
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Capacity breakdown by task</CardTitle>
          <CardDescription>
            Demand vs. what the current recovery plan can actually deliver —
            internal allocation plus any recommended outsourcing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Demand</TableHead>
                <TableHead>Staffing shortfall</TableHead>
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
                    {row.requirement.staffingShortfall > 0 ? (
                      <Badge variant="destructive">
                        {row.requirement.staffingShortfall} workers
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell>{formatNumber(row.allocation.resultingCapacity)}</TableCell>
                  <TableCell>
                    {row.outsourcedVolume > 0
                      ? formatNumber(row.outsourcedVolume)
                      : "—"}
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
            <CardTitle>Orders at risk of missing their deadline</CardTitle>
            <CardDescription>
              Ranked by priority and due date — the same order the recovery
              engine uses to allocate scarce capacity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {atRiskOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No orders are at risk under the current plan.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Priority</TableHead>
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
                        <Badge variant={priorityVariant[order.priority]}>
                          {formatPriority(order.priority)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(order.dueAt)}</TableCell>
                      <TableCell>
                        {formatNumber(fulfilment.shortfall)} /{" "}
                        {formatNumber(fulfilment.requestedQuantity)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {limitingFactorLabel[fulfilment.limitingFactor]}
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
              What the recovery engine flagged as infeasible or at its limit.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {plan.constraintViolations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No constraint violations — the full backlog is feasible under
                current capacity and inventory.
              </p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {plan.constraintViolations.map((violation, i) => (
                  <li key={i} className="flex gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    <span>{violation}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/recovery"
              className="mt-4 flex items-center gap-1 text-sm font-medium text-foreground hover:underline"
            >
              View full recovery plan <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
