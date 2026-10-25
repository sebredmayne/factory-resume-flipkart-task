import { ScenarioSimulator } from "@/components/scenarios/scenario-simulator";

export default function ScenariosPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Scenarios</h1>
        <p className="text-muted-foreground">
          Stress-test the next five days before committing: what happens if
          more staff don&apos;t return, a partner drops out, couriers thin out,
          or demand shifts again.
        </p>
      </div>

      <ScenarioSimulator />
    </div>
  );
}
