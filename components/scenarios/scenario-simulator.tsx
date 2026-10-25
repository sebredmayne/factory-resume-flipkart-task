"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, RotateCcw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlanSummary } from "@/components/recovery/plan-summary";
import {
  orders,
  workforce,
  tasks,
  inventory,
  providers,
  baselineScenario,
  SCENARIO_TODAY,
} from "@/lib/data";
import {
  generateRecoveryPlan,
  simulateScenario,
  type BaseData,
  type ScenarioChanges,
} from "@/lib/engine";
import { formatCurrency, formatNumber } from "@/lib/format";

const data: BaseData = { orders, tasks, workforce, inventory, providers };

function DeltaBadge({
  value,
  betterWhenPositive = true,
  suffix = "",
}: {
  value: number;
  betterWhenPositive?: boolean;
  suffix?: string;
}) {
  if (value === 0) {
    return <span className="text-xs text-muted-foreground">no change</span>;
  }
  const isGood = betterWhenPositive ? value > 0 : value < 0;
  const Icon = value > 0 ? ArrowUp : ArrowDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        isGood ? "text-emerald-600 dark:text-emerald-500" : "text-destructive"
      }`}
    >
      <Icon className="h-3 w-3" />
      {value > 0 ? "+" : ""}
      {formatNumber(value)}
      {suffix}
    </span>
  );
}

export function ScenarioSimulator() {
  const baselinePlan = useMemo(
    () => generateRecoveryPlan(baselineScenario, data, SCENARIO_TODAY),
    []
  );

  const [workforceLossOn, setWorkforceLossOn] = useState(false);
  const [workforceLossPct, setWorkforceLossPct] = useState([20]);

  const [providerOutageOn, setProviderOutageOn] = useState(false);
  const [providerOutageId, setProviderOutageId] = useState(providers[0].id);
  const [providerOutagePct, setProviderOutagePct] = useState([50]);

  const [demandChangeOn, setDemandChangeOn] = useState(false);
  const [demandChangePct, setDemandChangePct] = useState([15]);

  const [materialDelayOn, setMaterialDelayOn] = useState(false);
  const [materialDelaySku, setMaterialDelaySku] = useState(inventory[0].sku);
  const [materialDelayPct, setMaterialDelayPct] = useState([50]);

  const anyActive =
    workforceLossOn || providerOutageOn || demandChangeOn || materialDelayOn;

  const changes: ScenarioChanges = useMemo(() => {
    const labels: string[] = [];

    let workforceAvailability: ScenarioChanges["workforceAvailability"] = [];
    if (workforceLossOn) {
      labels.push(`${workforceLossPct[0]}% additional workforce loss`);
      workforceAvailability = workforce.map((g) => ({
        skill: g.skill,
        availableWorkers: Math.max(
          0,
          Math.round(g.availableWorkers * (1 - workforceLossPct[0] / 100))
        ),
      }));
    }

    let providerCapacityOverrides: ScenarioChanges["providerCapacityOverrides"] = [];
    const selectedProvider = providers.find((p) => p.id === providerOutageId);
    if (providerOutageOn && selectedProvider) {
      labels.push(`${selectedProvider.name} capacity down ${providerOutagePct[0]}%`);
      providerCapacityOverrides = [
        {
          providerId: selectedProvider.id,
          availableCapacity: Math.max(
            0,
            Math.round(
              selectedProvider.availableCapacity * (1 - providerOutagePct[0] / 100)
            )
          ),
        },
      ];
    }

    let demandMultiplier = 1;
    if (demandChangeOn) {
      labels.push(
        `${demandChangePct[0] >= 0 ? "+" : ""}${demandChangePct[0]}% demand`
      );
      demandMultiplier = 1 + demandChangePct[0] / 100;
    }

    let materialAvailabilityOverrides: ScenarioChanges["materialAvailabilityOverrides"] = [];
    const selectedItem = inventory.find((i) => i.sku === materialDelaySku);
    if (materialDelayOn && selectedItem) {
      labels.push(`${selectedItem.sku} stock down ${materialDelayPct[0]}%`);
      materialAvailabilityOverrides = [
        {
          sku: selectedItem.sku,
          availableQuantity: Math.max(
            0,
            Math.round(selectedItem.availableQuantity * (1 - materialDelayPct[0] / 100))
          ),
        },
      ];
    }

    return {
      name: labels.length > 0 ? labels.join(" + ") : "No changes",
      workforceAvailability,
      providerCapacityOverrides,
      demandMultiplier,
      materialAvailabilityOverrides,
    };
  }, [
    workforceLossOn,
    workforceLossPct,
    providerOutageOn,
    providerOutageId,
    providerOutagePct,
    demandChangeOn,
    demandChangePct,
    materialDelayOn,
    materialDelaySku,
    materialDelayPct,
  ]);

  const { scenario, comparison } = useMemo(
    () => simulateScenario(baselineScenario, changes, data, SCENARIO_TODAY),
    [changes]
  );

  const plan = scenario.recoveryResult!;

  function resetAll() {
    setWorkforceLossOn(false);
    setProviderOutageOn(false);
    setDemandChangeOn(false);
    setMaterialDelayOn(false);
  }

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Disruption controls</CardTitle>
            <CardDescription>
              Toggle one or more levers to see how the recovery plan responds.
              Everything recalculates immediately against the baseline.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={resetAll} disabled={!anyActive}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="workforce-loss" className="flex flex-col items-start gap-0.5">
                <span className="font-medium">Additional workforce loss</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Applies on top of current headcount, uniformly across every skill.
                </span>
              </Label>
              <Switch
                id="workforce-loss"
                checked={workforceLossOn}
                onCheckedChange={setWorkforceLossOn}
              />
            </div>
            {workforceLossOn && (
              <div className="flex items-center gap-4 pl-1">
                <Slider
                  value={workforceLossPct}
                  onValueChange={(v) => setWorkforceLossPct(v as number[])}
                  min={5}
                  max={80}
                  step={5}
                  className="max-w-xs"
                />
                <span className="w-12 text-sm text-muted-foreground">
                  {workforceLossPct[0]}%
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="provider-outage" className="flex flex-col items-start gap-0.5">
                <span className="font-medium">Provider capacity loss</span>
                <span className="text-xs font-normal text-muted-foreground">
                  A partner loses part of its confirmed capacity.
                </span>
              </Label>
              <Switch
                id="provider-outage"
                checked={providerOutageOn}
                onCheckedChange={setProviderOutageOn}
              />
            </div>
            {providerOutageOn && (
              <div className="flex flex-wrap items-center gap-4 pl-1">
                <Select
                  value={providerOutageId}
                  onValueChange={(v) => v && setProviderOutageId(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Slider
                  value={providerOutagePct}
                  onValueChange={(v) => setProviderOutagePct(v as number[])}
                  min={10}
                  max={100}
                  step={10}
                  className="max-w-xs"
                />
                <span className="w-12 text-sm text-muted-foreground">
                  {providerOutagePct[0]}%
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="demand-change" className="flex flex-col items-start gap-0.5">
                <span className="font-medium">Order volume change</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Scales every order&apos;s quantity up or down.
                </span>
              </Label>
              <Switch
                id="demand-change"
                checked={demandChangeOn}
                onCheckedChange={setDemandChangeOn}
              />
            </div>
            {demandChangeOn && (
              <div className="flex items-center gap-4 pl-1">
                <Slider
                  value={demandChangePct}
                  onValueChange={(v) => setDemandChangePct(v as number[])}
                  min={-30}
                  max={50}
                  step={5}
                  className="max-w-xs"
                />
                <span className="w-12 text-sm text-muted-foreground">
                  {demandChangePct[0] >= 0 ? "+" : ""}
                  {demandChangePct[0]}%
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="material-delay" className="flex flex-col items-start gap-0.5">
                <span className="font-medium">Material delay</span>
                <span className="text-xs font-normal text-muted-foreground">
                  An incoming shipment doesn&apos;t arrive — usable stock for one SKU drops.
                </span>
              </Label>
              <Switch
                id="material-delay"
                checked={materialDelayOn}
                onCheckedChange={setMaterialDelayOn}
              />
            </div>
            {materialDelayOn && (
              <div className="flex flex-wrap items-center gap-4 pl-1">
                <Select
                  value={materialDelaySku}
                  onValueChange={(v) => v && setMaterialDelaySku(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {inventory.map((item) => (
                      <SelectItem key={item.sku} value={item.sku}>
                        {item.sku}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Slider
                  value={materialDelayPct}
                  onValueChange={(v) => setMaterialDelayPct(v as number[])}
                  min={10}
                  max={100}
                  step={10}
                  className="max-w-xs"
                />
                <span className="w-12 text-sm text-muted-foreground">
                  {materialDelayPct[0]}%
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Baseline vs. scenario</CardTitle>
          <CardDescription>
            {anyActive ? scenario.name : "No changes applied — scenario matches the baseline plan."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Baseline</TableHead>
                <TableHead>Scenario</TableHead>
                <TableHead>Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Units fulfilled</TableCell>
                <TableCell>{formatNumber(baselinePlan.totalExpectedFulfilment)}</TableCell>
                <TableCell>{formatNumber(plan.totalExpectedFulfilment)}</TableCell>
                <TableCell>
                  <DeltaBadge value={comparison.fulfilmentDelta} />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Orders at risk</TableCell>
                <TableCell>{baselinePlan.ordersAtRisk.length}</TableCell>
                <TableCell>{plan.ordersAtRisk.length}</TableCell>
                <TableCell>
                  <DeltaBadge value={comparison.atRiskCountDelta} betterWhenPositive={false} />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Incremental cost</TableCell>
                <TableCell>{formatCurrency(baselinePlan.incrementalCost)}</TableCell>
                <TableCell>{formatCurrency(plan.incrementalCost)}</TableCell>
                <TableCell>
                  <DeltaBadge value={comparison.costDelta} betterWhenPositive={false} />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {(comparison.newlyAtRiskOrders.length > 0 || comparison.recoveredOrders.length > 0) && (
            <div className="mt-4 flex flex-col gap-2 text-sm">
              {comparison.newlyAtRiskOrders.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-muted-foreground">Newly at risk:</span>
                  {comparison.newlyAtRiskOrders.map((id) => (
                    <Badge key={id} variant="destructive">
                      {id}
                    </Badge>
                  ))}
                </div>
              )}
              {comparison.recoveredOrders.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-muted-foreground">Now fully recovered:</span>
                  {comparison.recoveredOrders.map((id) => (
                    <Badge key={id} variant="secondary">
                      {id}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scenario outcome</CardTitle>
          <CardDescription>
            Full recovery plan under the scenario above.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlanSummary plan={plan} orders={orders} />
        </CardContent>
      </Card>
    </div>
  );
}
