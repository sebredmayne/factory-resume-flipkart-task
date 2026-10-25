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
import type { OrderGroup, Priority, RecoveryPlan } from "@/lib/types";
import { compareOrdersByUrgency } from "@/lib/engine";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPriority,
} from "@/lib/format";

const priorityVariant: Record<
  Priority,
  "destructive" | "default" | "secondary" | "outline"
> = {
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

interface PlanSummaryProps {
  plan: RecoveryPlan;
  orders: OrderGroup[];
}

// Shared, presentation-only rendering of a recovery plan's outcome — used
// by the static baseline view (Recovery Plan page) and the interactive
// scenario simulator, so both always show the same shape of result.
export function PlanSummary({ plan, orders }: PlanSummaryProps) {
  const totalRequested = orders.reduce((sum, o) => sum + o.quantity, 0);
  const fulfilmentPercent = totalRequested
    ? Math.round((plan.totalExpectedFulfilment / totalRequested) * 100)
    : 0;

  const orderById = new Map(orders.map((o) => [o.id, o] as const));
  const sortedFulfilment = [...plan.orderFulfilment].sort((a, b) =>
    compareOrdersByUrgency(orderById.get(a.orderId)!, orderById.get(b.orderId)!)
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Fulfilled</p>
          <p className="text-xl font-semibold">
            {fulfilmentPercent}%{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({formatNumber(plan.totalExpectedFulfilment)} units)
            </span>
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Unfulfilled demand</p>
          <p className="text-xl font-semibold">
            {formatNumber(plan.unfulfilledDemand)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Orders at risk</p>
          <p className="text-xl font-semibold">
            {plan.ordersAtRisk.length} / {orders.length}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Incremental cost</p>
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
              <TableHead>Priority</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Fulfilled</TableHead>
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
                  <TableCell>
                    <Badge variant={priorityVariant[order.priority]}>
                      {formatPriority(order.priority)}
                    </Badge>
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
                    {limitingFactorLabel[f.limitingFactor]}
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
  orders,
}: PlanSummaryProps & { title: string; description?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <PlanSummary plan={plan} orders={orders} />
      </CardContent>
    </Card>
  );
}
