import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { baselineScenario } from "@/lib/data";

export default function ScenariosPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Scenarios</h1>
        <p className="text-muted-foreground">
          Compare the baseline operating plan against what-if disruptions.
          Scenario controls (workforce loss, provider outages, demand
          spikes) are added in a later build phase.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{baselineScenario.name}</CardTitle>
          <CardDescription>
            The current starting point. No overrides applied — demand
            multiplier {baselineScenario.demandMultiplier}x.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Recovery plan for this scenario has not been generated yet. Once
          the recovery engine is wired in, this card will show expected
          fulfilment, incremental cost and orders at risk for the baseline
          state.
        </CardContent>
      </Card>
    </div>
  );
}
