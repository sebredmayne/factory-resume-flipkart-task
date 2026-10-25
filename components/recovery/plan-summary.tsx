import { AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Essentiality, Priority, RecoveryPlan } from "@/lib/types";
import { compareOrdersByUrgency } from "@/lib/engine";
import {
  formatCurrency,
  formatDate,
  formatEssentiality,
  formatLimitingFactor,
  formatNumber,
  formatPercent,
  formatPriority,
} from "@/lib/format";

export const priorityVariant: Record<
  Priority,
  "destructive" | "default" | "secondary" | "outline"
> = {
  critical: "destructive",
  high: "default",
  standard: "secondary",
  low: "outline",
};

export function EssentialityBadge({ essentiality }: { essentiality: Essentiality }) {
  return (
    <Badge variant={essentiality === "essential" ? "default" : "outline"}>
      {formatEssentiality(essentiality)}
    </Badge>
  );
}

interface PlanSummaryProps {
  plan: RecoveryPlan;
}

// Shared, presentation-only rendering of a recovery plan's outcome — used
// by the Recovery Plan page, the daily loop and the scenario simulator, so
// all three always show the same shape of result. Orders come from the
// plan itself: they're the prioritised backlog the engine planned against.
export function PlanSummary({ plan }: PlanSummaryProps) {
  const orders = plan.orders;
  const totalRequested = orders.reduce((sum, o) => sum + o.quantity, 0);
  const fulfilmentRatio = totalRequested ? plan.totalExpectedFulfilment / totalRequested : 0;
  const essentialRatio = plan.essentialUnitsRequested
    ? plan.essentialUnitsFulfilled / plan.essentialUnitsRequested
    : 1;

  const orderById = new Map(orders.map((o) => [o.id, o] as const));
  const sortedFulfilment = [...plan.orderFulfilment].sort((a, b) =>
    compareOrdersByUrgency(orderById.get(a.orderId)!, orderById.get(b.orderId)!)
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div>
          <p className="text-xs text-muted-foreground">Ships today</p>
          <p className="text-xl font-semibold">
            {formatPercent(fulfilmentRatio)}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({formatNumber(plan.totalExpectedFulfilment)} units)
            </span>
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Essentials shipped</p>
          <p className="text-xl font-semibold">
            {formatPercent(essentialRatio)}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({formatNumber(plan.essentialUnitsFulfilled)} /{" "}
              {formatNumber(plan.essentialUnitsRequested)})
            </span>
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Rolls to tomorrow</p>
          <p className="text-xl font-semibold">
            {formatNumber(plan.unfulfilledDemand)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Orders not fully shipped</p>
          <p className="text-xl font-semibold">
            {plan.ordersAtRisk.length} / {orders.length}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Outsourcing spend</p>
          <p className="text-xl font-semibold">
            {formatCurrency(plan.incrementalCost)}
          </p>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Order-by-order fulfilment</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Need</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Ships</TableHead>
              <TableHead>Shortfall</TableHead>
              <TableHead>Limiting factor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedFulfilment.map((f) => {
              const order = orderById.get(f.orderId)!;
              return (
                <TableRow key={f.orderId}>
                  <TableCell className="font-medium">{f.orderId}</TableCell>
                  <TableCell className="text-muted-foreground">{order.sku}</TableCell>
                  <TableCell>
                    <EssentialityBadge essentiality={order.essentiality} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <Badge variant={priorityVariant[order.priority]}>
                        {formatPriority(order.priority)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {order.priorityReason}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(order.dueAt)}</TableCell>
                  <TableCell>{formatNumber(f.requestedQuantity)}</TableCell>
                  <TableCell>{formatNumber(f.fulfilledQuantity)}</TableCell>
                  <TableCell>
                    {f.shortfall > 0 ? (
                      <span className="text-destructive">{formatNumber(f.shortfall)}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatLimitingFactor(f.limitingFactor)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Constraints and bottlenecks</h3>
        {plan.constraintViolations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No constraint violations — the full backlog is feasible.
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
      </div>
    </div>
  );
}

export function PlanSummaryCard({
  title,
  description,
  plan,
}: PlanSummaryProps & { title: string; description?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <PlanSummary plan={plan} />
      </CardContent>
    </Card>
  );
}
