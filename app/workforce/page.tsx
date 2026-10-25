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
import { ArrowRight } from "lucide-react";
import {
  baseData,
  workforce,
  tasks,
  baselineScenario,
  SCENARIO_TODAY,
} from "@/lib/data";
import {
  generateRecoveryPlan,
  getAllocationPriorityOrder,
  taskDemandVolume,
} from "@/lib/engine";
import { formatNumber, formatSkill } from "@/lib/format";

export default function WorkforcePage() {
  const plan = generateRecoveryPlan(baselineScenario, baseData, SCENARIO_TODAY);
  const orders = plan.orders;
  const priorityOrder = getAllocationPriorityOrder(tasks, orders);
  const taskName = (id: string) => tasks.find((t) => t.id === id)?.name ?? id;

  const totalWorkers = workforce.reduce((sum, w) => sum + w.availableWorkers, 0);
  const totalRequired = plan.workforceRequirements.reduce(
    (sum, r) => sum + r.requiredWorkers,
    0
  );

  const taskRows = tasks.map((task) => {
    const requirement = plan.workforceRequirements.find((r) => r.taskId === task.id)!;
    const allocation = plan.internalAllocations.find((a) => a.taskId === task.id)!;
    const demand = taskDemandVolume(task.id, orders);
    const rank = priorityOrder.findIndex((p) => p.taskId === task.id) + 1;
    return { task, requirement, allocation, demand, rank };
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Workforce capacity
        </h1>
        <p className="text-muted-foreground">
          {totalWorkers} workers available against {totalRequired} required
          across all tasks. The people who are left are the wrong mix for the
          work, so the plan moves some of them.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Redeployments in today&apos;s plan</CardTitle>
          <CardDescription>
            A line ships only as fast as its slowest step. The engine moves one
            cross-skilled worker at a time from the best-covered task to the
            worst-covered one, and only when that lifts the weaker of the two.
            Moved workers are slower and lose ramp-up hours, and both costs are
            counted. Quality Inspection and Inventory Exceptions need
            certification, so no one is moved into them and their own staff
            are never moved out.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {plan.redeployments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No redeployment improves the line today.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Move</TableHead>
                  <TableHead>Workers</TableHead>
                  <TableHead>Speed on new task</TableHead>
                  <TableHead>Ramp-up</TableHead>
                  <TableHead>Units/shift given up</TableHead>
                  <TableHead>Units/shift gained</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.redeployments.map((r) => (
                  <TableRow key={`${r.groupId}-${r.toTaskId}`}>
                    <TableCell className="font-medium">
                      <span className="flex flex-wrap items-center gap-1">
                        {taskName(r.fromTaskId)}
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        {taskName(r.toTaskId)}
                      </span>
                    </TableCell>
                    <TableCell>{r.workers}</TableCell>
                    <TableCell>{Math.round(r.productivityFactor * 100)}%</TableCell>
                    <TableCell>{r.rampUpHours}h</TableCell>
                    <TableCell className="text-muted-foreground">
                      −{formatNumber(r.capacityLost)}
                    </TableCell>
                    <TableCell>+{formatNumber(r.capacityGained)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Required vs. available staffing, by task</CardTitle>
          <CardDescription>
            Required workers come from task demand and labour hours alone.
            &ldquo;Qualified&rdquo; counts only workers certified for the task;
            &ldquo;cross-trainable&rdquo; counts workers elsewhere who could
            cover it at reduced speed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Demand (units)</TableHead>
                <TableHead>Required workers</TableHead>
                <TableHead>Qualified</TableHead>
                <TableHead>Cross-trainable</TableHead>
                <TableHead>Allocated (redeployed in)</TableHead>
                <TableHead>Unfilled</TableHead>
                <TableHead>Resulting capacity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taskRows.map(({ task, requirement, allocation, demand }) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.name}</TableCell>
                  <TableCell>{formatNumber(demand)}</TableCell>
                  <TableCell>{requirement.requiredWorkers}</TableCell>
                  <TableCell>{requirement.availableQualifiedWorkers}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {task.crossTrainingAllowed ? requirement.crossTrainableWorkers : "Certified only"}
                  </TableCell>
                  <TableCell>
                    {allocation.allocatedWorkers}
                    {allocation.redeployedInWorkers > 0 && (
                      <span className="text-muted-foreground">
                        {" "}(+{allocation.redeployedInWorkers})
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {allocation.unfilledWorkers > 0 ? (
                      <Badge variant="destructive">{allocation.unfilledWorkers}</Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell>{formatNumber(allocation.resultingCapacity)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Allocation priority order</CardTitle>
          <CardDescription>
            The order the recovery engine staffs tasks in when workers are
            scarce. Mandatory tasks (quality and safety-critical work that
            can&apos;t be outsourced) are reserved first regardless of
            demand; everything else is ranked by a priority score weighted
            by order urgency, volume, and how many other tasks depend on it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Reservation</TableHead>
                <TableHead>Priority score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {priorityOrder.map((entry, i) => {
                const task = tasks.find((t) => t.id === entry.taskId)!;
                return (
                  <TableRow key={entry.taskId}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{task.name}</TableCell>
                    <TableCell>
                      {entry.isMandatory ? (
                        <Badge variant="outline">Mandatory — reserved first</Badge>
                      ) : (
                        <Badge variant="secondary">Discretionary</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.isMandatory ? "—" : formatNumber(Math.round(entry.score))}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Task definitions</CardTitle>
          <CardDescription>
            Labour hours per unit drives the required-workers calculation
            above; prerequisites determine the order units flow through the
            line.
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
                <TableHead>Prerequisites</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.name}</TableCell>
                  <TableCell>{formatSkill(task.requiredSkill)}</TableCell>
                  <TableCell>{task.labourHoursPerUnit}</TableCell>
                  <TableCell>{formatNumber(task.maxThroughput)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {task.prerequisites.length > 0
                      ? task.prerequisites.join(", ")
                      : "None"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workforce roster</CardTitle>
          <CardDescription>
            Post-disruption headcount. Each group works its certified task and
            can be redeployed only along its listed cross-skills.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Skill</TableHead>
                <TableHead>Available workers</TableHead>
                <TableHead>Hours / shift</TableHead>
                <TableHead>Productivity / hr</TableHead>
                <TableHead>Qualification</TableHead>
                <TableHead>Certified for</TableHead>
                <TableHead>Can cover</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workforce.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">
                    {formatSkill(group.skill)}
                  </TableCell>
                  <TableCell>{group.availableWorkers}</TableCell>
                  <TableCell>{group.hoursPerShift}h</TableCell>
                  <TableCell>{group.productivityPerHour} units</TableCell>
                  <TableCell className="text-muted-foreground">
                    {group.qualification}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {group.taskEligibility.map((taskId) => (
                        <Badge key={taskId} variant="outline">
                          {taskName(taskId)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {group.crossSkills.length === 0
                      ? "—"
                      : group.crossSkills
                          .map(
                            (c) =>
                              `${taskName(c.taskId)} at ${Math.round(c.productivityFactor * 100)}% after ${c.rampUpHours}h`
                          )
                          .join(" · ")}
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
