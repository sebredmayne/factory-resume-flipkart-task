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
  getAllocationPriorityOrder,
  taskDemandVolume,
  type BaseData,
} from "@/lib/engine";
import { formatNumber, formatSkill } from "@/lib/format";

export default function WorkforcePage() {
  const data: BaseData = { orders, tasks, workforce, inventory, providers };
  const plan = generateRecoveryPlan(baselineScenario, data, SCENARIO_TODAY);
  const priorityOrder = getAllocationPriorityOrder(tasks, orders);

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
          across all tasks — allocation below reflects the current recovery
          plan.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Required vs. available staffing, by task</CardTitle>
          <CardDescription>
            Required workers come from task demand and labour hours alone;
            availability is limited to workers who are both in the right
            skill group and explicitly eligible for that task.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Demand (units)</TableHead>
                <TableHead>Required workers</TableHead>
                <TableHead>Available qualified</TableHead>
                <TableHead>Allocated</TableHead>
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
                  <TableCell>{allocation.allocatedWorkers}</TableCell>
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
            Each group can only be allocated to tasks it is qualified and
            eligible for.
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
                <TableHead>Eligible tasks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workforce.map((group) => (
                <TableRow key={group.skill}>
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
                          {taskId}
                        </Badge>
                      ))}
                    </div>
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
