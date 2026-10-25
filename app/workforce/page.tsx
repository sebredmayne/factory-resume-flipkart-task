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
import { tasks, workforce } from "@/lib/data";
import { formatNumber, formatSkill } from "@/lib/format";

export default function WorkforcePage() {
  const totalWorkers = workforce.reduce((sum, w) => sum + w.availableWorkers, 0);
  const totalShiftCapacityUnits = workforce.reduce(
    (sum, w) => sum + w.availableWorkers * w.hoursPerShift * w.productivityPerHour,
    0
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Workforce capacity
        </h1>
        <p className="text-muted-foreground">
          {totalWorkers} workers available across {workforce.length} skill
          groups · {formatNumber(totalShiftCapacityUnits)} units of raw
          per-shift output capacity.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available workforce by skill</CardTitle>
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

      <Card>
        <CardHeader>
          <CardTitle>Task definitions</CardTitle>
          <CardDescription>
            Labour hours per unit and prerequisite tasks drive the staffing
            requirement calculation (added in the next phase).
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
    </div>
  );
}
