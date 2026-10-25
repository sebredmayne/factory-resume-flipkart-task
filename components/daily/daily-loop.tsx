"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  baselineScenario,
  tasks,
  workforce,
  providers,
  SCENARIO_TODAY,
} from "@/lib/data";
import {
  bindingConstraint,
  closeDay,
  initialDayState,
  planDay,
  plannedTaskUnits,
  summariseOutcome,
  type DayState,
  type TaskActuals,
} from "@/lib/engine";
import {
  formatCurrency,
  formatDate,
  formatDay,
  formatNumber,
  formatPercent,
  formatSkill,
} from "@/lib/format";

function NumberField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <input
      id={id}
      type="number"
      min={0}
      value={value}
      onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
      className="h-8 w-24 rounded-md border bg-background px-2 text-sm tabular-nums"
    />
  );
}

const freshState = () => initialDayState(baseData, baselineScenario, SCENARIO_TODAY);

// The daily re-planning loop, run by hand: check in who showed up, take the
// plan, report what the floor actually did, close the day. Everything is
// local state — there's no backend in this prototype.
export function DailyLoop() {
  const [state, setState] = useState<DayState>(freshState);
  const [checkIn, setCheckIn] = useState<Record<string, number>>({});
  const [actuals, setActuals] = useState<TaskActuals>({});

  const headcount = (groupId: string) =>
    checkIn[groupId] ?? workforce.find((g) => g.id === groupId)!.availableWorkers;

  const plan = useMemo(
    () =>
      planDay(
        state,
        baseData,
        baselineScenario,
        "managed",
        workforce.map((g) => ({ groupId: g.id, availableWorkers: checkIn[g.id] ?? g.availableWorkers }))
      ),
    [state, checkIn]
  );
  const planned = plannedTaskUnits(plan);
  const actualFor = (taskId: string) => actuals[taskId] ?? planned[taskId] ?? 0;
  const outcome = summariseOutcome(state);
  const binding = bindingConstraint(plan, tasks);
  const providerName = (id: string) => providers.find((p) => p.id === id)?.name ?? id;
  const taskName = (id: string) => tasks.find((t) => t.id === id)?.name ?? id;

  function close() {
    const reported = Object.fromEntries(tasks.map((t) => [t.id, actualFor(t.id)]));
    setState(closeDay(state, plan, baseData, baselineScenario, reported));
    setCheckIn({});
    setActuals({});
  }

  function reset() {
    setState(freshState());
    setCheckIn({});
    setActuals({});
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge>{formatDay(state.dayIndex)}</Badge>
          <span className="text-sm text-muted-foreground">{formatDate(state.date)}</span>
          <span className="text-sm text-muted-foreground">
            · {formatNumber(state.backlog.reduce((s, o) => s + o.quantity, 0))} units in the backlog
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={reset} disabled={state.dayIndex === 0}>
          <RotateCcw className="h-3.5 w-3.5" />
          Back to {formatDay(0)}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1 · Morning check-in</CardTitle>
          <CardDescription>
            Who actually showed up. The roster is a guess on a day like this,
            so the plan starts from the headcount on the floor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {workforce.map((group) => (
              <label key={group.id} htmlFor={`checkin-${group.id}`} className="flex flex-col gap-1 text-sm">
                <span className="font-medium">{formatSkill(group.skill)}</span>
                <NumberField
                  id={`checkin-${group.id}`}
                  value={headcount(group.id)}
                  onChange={(v) => setCheckIn({ ...checkIn, [group.id]: v })}
                />
                <span className="text-xs text-muted-foreground">
                  roster: {group.availableWorkers}
                </span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2 · Today&apos;s plan</CardTitle>
          <CardDescription>
            Rebuilt from this morning&apos;s headcount, the rolled-over backlog,
            today&apos;s stock, partners already requested, and productivity
            recalibrated from previous days.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Binding constraint</p>
              <p className="font-medium">{binding.label}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Redeployments</p>
              {plan.redeployments.length === 0 ? (
                <p className="text-muted-foreground">None</p>
              ) : (
                <ul>
                  {plan.redeployments.map((r) => (
                    <li key={`${r.groupId}-${r.toTaskId}`}>
                      {r.workers} × {taskName(r.fromTaskId)} → {taskName(r.toTaskId)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Partners</p>
              {plan.outsourcedVolumes.length === 0 && plan.providerRequests.length === 0 ? (
                <p className="text-muted-foreground">None</p>
              ) : (
                <ul>
                  {plan.outsourcedVolumes.map((r) => (
                    <li key={`${r.providerId}-${r.taskId}`}>
                      {providerName(r.providerId)}: {formatNumber(r.recommendedVolume)} units
                    </li>
                  ))}
                  {plan.providerRequests
                    .filter((r, i, all) => all.findIndex((x) => x.providerId === r.providerId) === i)
                    .map((r) => (
                    <li key={`req-${r.providerId}`} className="text-muted-foreground">
                      Request {providerName(r.providerId)} now — live {formatDay(r.availableFromDay)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <PlanSummary plan={plan} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3 · End-of-shift actuals</CardTitle>
          <CardDescription>
            Units each step actually processed. Pre-filled with the plan —
            change one to see what happens (try packing at 80% of plan).
            Orders ship only as far as the weakest step on their route allowed,
            and tomorrow&apos;s productivity is nudged halfway toward what the
            floor achieved.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Planned</TableHead>
                <TableHead>Actual</TableHead>
                <TableHead>Productivity factor in use</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.name}</TableCell>
                  <TableCell>{formatNumber(planned[task.id] ?? 0)}</TableCell>
                  <TableCell>
                    <NumberField
                      id={`actual-${task.id}`}
                      value={actualFor(task.id)}
                      onChange={(v) => setActuals({ ...actuals, [task.id]: v })}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatPercent(state.calibration[task.id] ?? 1)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div>
            <Button onClick={close}>Close {formatDay(state.dayIndex)} and plan {formatDay(state.dayIndex + 1)}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Days closed</CardTitle>
          <CardDescription>
            Plan accuracy is actual ÷ planned units shipped — the measure of
            whether managers can trust tomorrow&apos;s plan.
            {state.history.length > 0 && (
              <>
                {" "}So far: {formatPercent(outcome.essentialOnTimeRate)} of
                essential units due have shipped on time.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state.history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No days closed yet. Close {formatDay(0)} above to start the loop.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead>Planned</TableHead>
                  <TableHead>Shipped</TableHead>
                  <TableHead>Plan accuracy</TableHead>
                  <TableHead>Essentials shipped</TableHead>
                  <TableHead>Spend</TableHead>
                  <TableHead>New orders</TableHead>
                  <TableHead>Backlog at close</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.history.map((d) => (
                  <TableRow key={d.dayIndex}>
                    <TableCell className="font-medium">
                      {formatDay(d.dayIndex)}{" "}
                      <span className="text-muted-foreground">· {formatDate(d.date)}</span>
                    </TableCell>
                    <TableCell>{formatNumber(d.plannedUnits)}</TableCell>
                    <TableCell>{formatNumber(d.actualUnits)}</TableCell>
                    <TableCell>
                      <Badge variant={d.planAccuracy < 0.9 ? "destructive" : "secondary"}>
                        {formatPercent(d.planAccuracy)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatNumber(d.essentialShipped)}</TableCell>
                    <TableCell>{formatCurrency(d.cost)}</TableCell>
                    <TableCell>{formatNumber(d.newOrderUnits)}</TableCell>
                    <TableCell>{formatNumber(d.backlogEndUnits)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
