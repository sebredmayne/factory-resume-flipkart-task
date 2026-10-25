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
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, ShieldCheck } from "lucide-react";
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
import { formatCurrency, formatNumber } from "@/lib/format";

export default function OutsourcingPage() {
  const data: BaseData = { orders, tasks, workforce, inventory, providers };
  const plan = generateRecoveryPlan(baselineScenario, data, SCENARIO_TODAY);

  const providerById = new Map(providers.map((p) => [p.id, p] as const));

  const recommendationsByTask = new Map<string, typeof plan.outsourcedVolumes>();
  for (const rec of plan.outsourcedVolumes) {
    const list = recommendationsByTask.get(rec.taskId) ?? [];
    list.push(rec);
    recommendationsByTask.set(rec.taskId, list);
  }

  const totalRecommendedVolume = plan.outsourcedVolumes.reduce(
    (sum, r) => sum + r.recommendedVolume,
    0
  );

  const internalOnlyTasks = tasks.filter((t) => !t.outsourcingEligible);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Outsourcing recommendations
        </h1>
        <p className="text-muted-foreground">
          {plan.outsourcedVolumes.length} recommended engagements ·{" "}
          {formatNumber(totalRecommendedVolume)} units ·{" "}
          {formatCurrency(plan.incrementalCost)} incremental cost.
        </p>
      </div>

      {tasks
        .filter((task) => recommendationsByTask.has(task.id))
        .map((task) => {
          const recs = recommendationsByTask.get(task.id)!;
          return (
            <Card key={task.id}>
              <CardHeader>
                <CardTitle>{task.name}</CardTitle>
                <CardDescription>
                  Internal capacity falls short of demand for this task — the
                  engine evaluated eligible providers by cost, location, and
                  activation time.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {recs.map((rec, i) => {
                  const provider = providerById.get(rec.providerId)!;
                  return (
                    <div key={rec.providerId}>
                      {i > 0 && <Separator className="mb-4" />}
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{provider.name}</span>
                            <Badge variant="secondary">
                              {formatNumber(rec.recommendedVolume)} units
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(rec.estimatedCost)} ·{" "}
                            {formatCurrency(provider.costPerUnit)}/unit ·{" "}
                            {provider.activationHours}h activation
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{rec.rationale}</p>
                        {rec.ordersRecovered.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 text-sm">
                            <span className="text-muted-foreground">Helps fulfil:</span>
                            {rec.ordersRecovered.map((orderId) => (
                              <Badge key={orderId} variant="outline">
                                {orderId}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {rec.risks.length > 0 && (
                          <ul className="flex flex-col gap-1">
                            {rec.risks.map((risk, j) => (
                              <li
                                key={j}
                                className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-500"
                              >
                                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                <span>{risk}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}

      <Card>
        <CardHeader>
          <CardTitle>Kept internal — not eligible for outsourcing</CardTitle>
          <CardDescription>
            These tasks are safety or quality-critical and are never routed
            to an external partner, regardless of shortfall.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {internalOnlyTasks.map((task) => (
            <div key={task.id} className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{task.name}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>External provider directory</CardTitle>
          <CardDescription>
            All confirmed partners and their terms, regardless of whether
            they&apos;re used in the current plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Services</TableHead>
                <TableHead>Capacity / day</TableHead>
                <TableHead>Cost / unit</TableHead>
                <TableHead>Activation time</TableHead>
                <TableHead>Locations</TableHead>
                <TableHead>Quality requirements</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map((provider) => (
                <TableRow key={provider.id}>
                  <TableCell className="font-medium">{provider.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {provider.services.map((service) => (
                        <Badge key={service} variant="outline">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{formatNumber(provider.availableCapacity)}</TableCell>
                  <TableCell>{formatCurrency(provider.costPerUnit)}</TableCell>
                  <TableCell>{provider.activationHours}h</TableCell>
                  <TableCell className="text-muted-foreground">
                    {provider.supportedLocations.join(", ")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {provider.qualityRequirements ?? "None specified"}
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
