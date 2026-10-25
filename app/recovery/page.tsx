import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { orders } from "@/lib/data";
import { formatCurrency, formatDate, formatNumber, formatPriority } from "@/lib/format";

const priorityVariant: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  critical: "destructive",
  high: "default",
  standard: "secondary",
  low: "outline",
};

export default function RecoveryPage() {
  const sortedOrders = [...orders].sort((a, b) =>
    a.dueAt.localeCompare(b.dueAt)
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Recovery plan
        </h1>
        <p className="text-muted-foreground">
          Combines internal staffing, outsourcing and order priorities into a
          feasible operating plan. The generation engine lands in the next
          build phase — this page currently shows the backlog it will need
          to resolve.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending order backlog</CardTitle>
          <CardDescription>
            Sorted by due date. The recovery engine will decide what gets
            fulfilled internally, what gets outsourced, and what stays at
            risk.
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
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedOrders.map((order) => (
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
                  <TableCell>
                    {formatCurrency(order.quantity * order.unitValue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
