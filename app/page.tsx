import { AlertTriangle, Package, Truck, Users } from "lucide-react";
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
import { orders, workforce, providers, tasks } from "@/lib/data";
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

export default function OverviewPage() {
  const totalOrders = orders.length;
  const totalUnitsPending = orders.reduce((sum, o) => sum + o.quantity, 0);
  const totalOrderValue = orders.reduce(
    (sum, o) => sum + o.quantity * o.unitValue,
    0
  );

  const totalWorkersAvailable = workforce.reduce(
    (sum, w) => sum + w.availableWorkers,
    0
  );

  const totalOutsourcingCapacity = providers.reduce(
    (sum, p) => sum + p.availableCapacity,
    0
  );

  const atRiskOrders = orders
    .filter((o) => o.priority === "critical" || o.priority === "high")
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Operations overview
        </h1>
        <p className="text-muted-foreground">
          Fernwell fulfilment centre — operating at reduced capacity after a
          workforce disruption.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              Down ~50% since the disruption
            </p>
          </CardContent>
        </Card>

        <Card>
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
              units/day across {providers.length} partners
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Orders at risk
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {atRiskOrders.length}
            </div>
            <p className="text-xs text-muted-foreground">
              critical/high priority, capacity not yet confirmed
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Internal fulfilment capacity</CardTitle>
          <CardDescription>
            Maximum daily throughput per task, independent of current
            staffing levels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Required skill</TableHead>
                <TableHead>Labour hrs / unit</TableHead>
                <TableHead>Max throughput / shift</TableHead>
                <TableHead>Outsourcing eligible</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.name}</TableCell>
                  <TableCell>{task.requiredSkill}</TableCell>
                  <TableCell>{task.labourHoursPerUnit}</TableCell>
                  <TableCell>{formatNumber(task.maxThroughput)}</TableCell>
                  <TableCell>
                    {task.outsourcingEligible ? (
                      <Badge variant="secondary">Yes</Badge>
                    ) : (
                      <Badge variant="outline">No — internal only</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Orders at risk of missing their deadline</CardTitle>
          <CardDescription>
            Critical and high priority orders, soonest due date first. Full
            risk scoring arrives once the recovery engine is wired in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {atRiskOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>{order.sku}</TableCell>
                  <TableCell>{formatNumber(order.quantity)}</TableCell>
                  <TableCell>
                    <Badge variant={priorityVariant[order.priority]}>
                      {formatPriority(order.priority)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(order.dueAt)}</TableCell>
                  <TableCell>{order.location}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
