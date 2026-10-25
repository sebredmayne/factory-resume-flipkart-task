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
  baseData,
  workforce,
  tasks,
  inventory,
  providers,
  lastMile,
  baselineScenario,
  SCENARIO_TODAY,
} from "@/lib/data";
import {
  bindingConstraint,
  simulateScenario,
  type ScenarioChanges,
} from "@/lib/engine";
import type { Essentiality } from "@/lib/types";
import {
  formatCurrency,
  formatDay,
  formatEssentiality,
  formatNumber,
  formatPercent,
} from "@/lib/format";

const OUTLOOK_DAYS = 5;
const ESSENTIALITIES: Essentiality[] = ["essential", "everyday", "discretionary"];
const baselineShiftPct = (e: Essentiality) =>
  Math.round(baselineScenario.demandShift[e] * 100);
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

function Lever({
  id,
  title,
  description,
  checked,
  onCheckedChange,
  children,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="flex flex-col items-start gap-0.5">
          <span className="font-medium">{title}</span>
          <span className="text-xs font-normal text-muted-foreground">{description}</span>
        </Label>
        <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
      </div>
      {checked && <div className="flex flex-wrap items-center gap-4 pl-1">{children}</div>}
    </div>
  );
}

function PercentSlider({
  value,
  onChange,
  min,
  max,
  step,
  prefix = "",
}: {
  value: number[];
  onChange: (value: number[]) => void;
  min: number;
  max: number;
  step: number;
  prefix?: string;
}) {
  return (
    <>
      <Slider
        value={value}
        onValueChange={(v) => onChange(v as number[])}
        min={min}
        max={max}
        step={step}
        className="w-48"
      />
      <span className="w-14 text-sm text-muted-foreground">
        {prefix}
        {value[0]}%
      </span>
    </>
  );
}

export function ScenarioSimulator() {
  const [workforceLossOn, setWorkforceLossOn] = useState(false);
  const [workforceLossPct, setWorkforceLossPct] = useState([20]);

  const [providerOutageOn, setProviderOutageOn] = useState(false);
  const [providerOutageId, setProviderOutageId] = useState(providers[0].id);
  const [providerOutagePct, setProviderOutagePct] = useState([100]);

  const [demandMixOn, setDemandMixOn] = useState(false);
  const [demandMixPct, setDemandMixPct] = useState<Record<Essentiality, number[]>>({
    essential: [baselineShiftPct("essential")],
    everyday: [baselineShiftPct("everyday")],
    discretionary: [baselineShiftPct("discretionary")],
  });

  const [regionalOn, setRegionalOn] = useState(false);
  const [regionalLocation, setRegionalLocation] = useState(lastMile[1].location);
  const [regionalPct, setRegionalPct] = useState([40]);

  const [lastMileOn, setLastMileOn] = useState(false);
  const [lastMileLocation, setLastMileLocation] = useState(lastMile[0].location);
  const [lastMilePct, setLastMilePct] = useState([50]);

  const [materialDelayOn, setMaterialDelayOn] = useState(false);
  const [materialDelaySku, setMaterialDelaySku] = useState(inventory[0].sku);
  const [materialDelayPct, setMaterialDelayPct] = useState([50]);

  const anyActive =
    workforceLossOn || providerOutageOn || demandMixOn || regionalOn || lastMileOn || materialDelayOn;

  const changes: ScenarioChanges = useMemo(() => {
    const labels: string[] = [];
    const result: ScenarioChanges = {};

    if (workforceLossOn) {
      labels.push(`${workforceLossPct[0]}% more staff lost`);
      result.workforceAvailability = workforce.map((g) => ({
        groupId: g.id,
        availableWorkers: Math.max(0, Math.round(g.availableWorkers * (1 - workforceLossPct[0] / 100))),
      }));
    }

    const selectedProvider = providers.find((p) => p.id === providerOutageId);
    if (providerOutageOn && selectedProvider) {
      labels.push(`${selectedProvider.name} down ${providerOutagePct[0]}%`);
      result.providerCapacityOverrides = [
        {
          providerId: selectedProvider.id,
          availableCapacity: Math.max(
            0,
            Math.round(selectedProvider.availableCapacity * (1 - providerOutagePct[0] / 100))
          ),
        },
      ];
    }

    if (demandMixOn) {
      labels.push(
        `demand ${ESSENTIALITIES.map((e) => `${formatEssentiality(e).toLowerCase()} ${demandMixPct[e][0]}%`).join(" / ")}`
      );
      result.demandShift = {
        essential: demandMixPct.essential[0] / 100,
        everyday: demandMixPct.everyday[0] / 100,
        discretionary: demandMixPct.discretionary[0] / 100,
      };
    }

    if (regionalOn) {
      labels.push(`${regionalLocation} demand at ${regionalPct[0]}%`);
      result.locationDemand = [{ location: regionalLocation, multiplier: regionalPct[0] / 100 }];
    }

    const lane = lastMile.find((l) => l.location === lastMileLocation);
    if (lastMileOn && lane) {
      labels.push(`${lane.location} couriers down ${lastMilePct[0]}%`);
      result.lastMileOverrides = [
        {
          location: lane.location,
          capacityPerDay: Math.max(0, Math.round(lane.capacityPerDay * (1 - lastMilePct[0] / 100))),
        },
      ];
    }

    const selectedItem = inventory.find((i) => i.sku === materialDelaySku);
    if (materialDelayOn && selectedItem) {
      labels.push(`${selectedItem.sku} stock down ${materialDelayPct[0]}%`);
      result.materialAvailabilityOverrides = [
        {
          sku: selectedItem.sku,
          availableQuantity: Math.max(
            0,
            Math.round(selectedItem.availableQuantity * (1 - materialDelayPct[0] / 100))
          ),
        },
      ];
    }

    return { ...result, name: labels.length > 0 ? labels.join(" + ") : "No changes" };
  }, [
    workforceLossOn,
    workforceLossPct,
    providerOutageOn,
    providerOutageId,
    providerOutagePct,
    demandMixOn,
    demandMixPct,
    regionalOn,
    regionalLocation,
    regionalPct,
    lastMileOn,
    lastMileLocation,
    lastMilePct,
    materialDelayOn,
    materialDelaySku,
    materialDelayPct,
  ]);

  const { scenario, comparison, baselineOutlook, outlook } = useMemo(
    () => simulateScenario(baselineScenario, changes, baseData, SCENARIO_TODAY, OUTLOOK_DAYS),
    [changes]
  );

  const plan = scenario.recoveryResult!;
  const base = baselineOutlook.summary;
  const next = outlook.summary;

  function resetAll() {
    setWorkforceLossOn(false);
    setProviderOutageOn(false);
    setDemandMixOn(false);
    setRegionalOn(false);
    setLastMileOn(false);
    setMaterialDelayOn(false);
  }

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>What could get worse</CardTitle>
            <CardDescription>
              Toggle one or more levers. Each scenario runs the daily loop
              forward {OUTLOOK_DAYS} days — demand changes arrive as new
              orders, and partners requested today only help tomorrow.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={resetAll} disabled={!anyActive}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Lever
            id="workforce-loss"
            title="More staff lost"
            description="On top of today's headcount, uniformly across every team."
            checked={workforceLossOn}
            onCheckedChange={setWorkforceLossOn}
          >
            <PercentSlider value={workforceLossPct} onChange={setWorkforceLossPct} min={5} max={80} step={5} />
          </Lever>

          <Lever
            id="provider-outage"
            title="Partner capacity loss"
            description="A partner loses part or all of its confirmed capacity."
            checked={providerOutageOn}
            onCheckedChange={setProviderOutageOn}
          >
            <Select value={providerOutageId} onValueChange={(v) => v && setProviderOutageId(v)}>
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
            <PercentSlider value={providerOutagePct} onChange={setProviderOutagePct} min={10} max={100} step={10} />
          </Lever>

          <Lever
            id="demand-mix"
            title="Demand mix"
            description={`New orders as a share of pre-disruption demand. Baseline: half the customers are gone and the rest are stockpiling essentials (${ESSENTIALITIES.map((e) => `${baselineShiftPct(e)}%`).join(" / ")}).`}
            checked={demandMixOn}
            onCheckedChange={setDemandMixOn}
          >
            <div className="flex w-full flex-col gap-2">
              {ESSENTIALITIES.map((e) => (
                <div key={e} className="flex items-center gap-4">
                  <span className="w-28 text-sm">{formatEssentiality(e)}</span>
                  <PercentSlider
                    value={demandMixPct[e]}
                    onChange={(v) => setDemandMixPct({ ...demandMixPct, [e]: v })}
                    min={0}
                    max={200}
                    step={10}
                  />
                </div>
              ))}
            </div>
          </Lever>

          <Lever
            id="regional"
            title="Regional demand collapse"
            description="One region was hit harder — fewer people left to order."
            checked={regionalOn}
            onCheckedChange={setRegionalOn}
          >
            <Select value={regionalLocation} onValueChange={(v) => v && setRegionalLocation(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {lastMile.map((l) => (
                  <SelectItem key={l.location} value={l.location}>
                    {l.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <PercentSlider value={regionalPct} onChange={setRegionalPct} min={0} max={100} step={10} />
            <span className="text-xs text-muted-foreground">of baseline demand</span>
          </Lever>

          <Lever
            id="last-mile"
            title="Courier capacity loss"
            description="Fewer couriers out of one fulfilment centre."
            checked={lastMileOn}
            onCheckedChange={setLastMileOn}
          >
            <Select value={lastMileLocation} onValueChange={(v) => v && setLastMileLocation(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {lastMile.map((l) => (
                  <SelectItem key={l.location} value={l.location}>
                    {l.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <PercentSlider value={lastMilePct} onChange={setLastMilePct} min={10} max={100} step={10} />
          </Lever>

          <Lever
            id="material-delay"
            title="Material delay"
            description="Usable stock for one SKU drops — a shipment didn't arrive."
            checked={materialDelayOn}
            onCheckedChange={setMaterialDelayOn}
          >
            <Select value={materialDelaySku} onValueChange={(v) => v && setMaterialDelaySku(v)}>
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
            <PercentSlider value={materialDelayPct} onChange={setMaterialDelayPct} min={10} max={100} step={10} />
          </Lever>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Baseline vs. scenario — {OUTLOOK_DAYS}-day outlook</CardTitle>
          <CardDescription>
            {anyActive ? scenario.name : "No changes applied — scenario matches the baseline."}
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
                <TableCell className="font-medium">Essential units on time</TableCell>
                <TableCell>{formatPercent(base.essentialOnTimeRate)}</TableCell>
                <TableCell>{formatPercent(next.essentialOnTimeRate)}</TableCell>
                <TableCell>
                  <DeltaBadge value={comparison.essentialOnTimeDelta} suffix=" pts" />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Units shipped</TableCell>
                <TableCell>{formatNumber(base.shippedUnits)}</TableCell>
                <TableCell>{formatNumber(next.shippedUnits)}</TableCell>
                <TableCell>
                  <DeltaBadge value={comparison.fulfilmentDelta} />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Backlog after {formatDay(OUTLOOK_DAYS - 1)}</TableCell>
                <TableCell>{formatNumber(base.endBacklogUnits)}</TableCell>
                <TableCell>{formatNumber(next.endBacklogUnits)}</TableCell>
                <TableCell>
                  <DeltaBadge value={comparison.endBacklogDelta} betterWhenPositive={false} />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Outsourcing spend</TableCell>
                <TableCell>{formatCurrency(base.cost)}</TableCell>
                <TableCell>{formatCurrency(next.cost)}</TableCell>
                <TableCell>
                  <DeltaBadge value={comparison.costDelta} betterWhenPositive={false} />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Orders not fully shipping on {formatDay(0)}</TableCell>
                <TableCell>{baselineOutlook.plans[0].ordersAtRisk.length}</TableCell>
                <TableCell>{plan.ordersAtRisk.length}</TableCell>
                <TableCell>
                  <DeltaBadge value={comparison.atRiskCountDelta} betterWhenPositive={false} />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {(comparison.newlyAtRiskOrders.length > 0 || comparison.recoveredOrders.length > 0) && (
            <div className="mt-4 flex flex-col gap-2 text-sm">
              {comparison.newlyAtRiskOrders.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-muted-foreground">Newly short on {formatDay(0)}:</span>
                  {comparison.newlyAtRiskOrders.map((id) => (
                    <Badge key={id} variant="destructive">
                      {id}
                    </Badge>
                  ))}
                </div>
              )}
              {comparison.recoveredOrders.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-muted-foreground">Now fully shipping on {formatDay(0)}:</span>
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
          <CardTitle>Day by day under the scenario</CardTitle>
          <CardDescription>
            Where the binding constraint sits each day — the thing to fix next.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead>Ships (baseline)</TableHead>
                <TableHead>Ships (scenario)</TableHead>
                <TableHead>Binding constraint</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outlook.plans.map((dayPlan, i) => (
                <TableRow key={dayPlan.dayIndex}>
                  <TableCell className="font-medium">{formatDay(dayPlan.dayIndex)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatNumber(baselineOutlook.plans[i].totalExpectedFulfilment)}
                  </TableCell>
                  <TableCell>{formatNumber(dayPlan.totalExpectedFulfilment)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{bindingConstraint(dayPlan, tasks).label}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{formatDay(0)} plan under the scenario</CardTitle>
          <CardDescription>Full recovery plan for today under the scenario above.</CardDescription>
        </CardHeader>
        <CardContent>
          <PlanSummary plan={plan} />
        </CardContent>
      </Card>
    </div>
  );
}
