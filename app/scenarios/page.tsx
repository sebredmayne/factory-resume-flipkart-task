import { ScenarioSimulator } from "@/components/scenarios/scenario-simulator";

export default function ScenariosPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Scenarios</h1>
        <p className="text-muted-foreground">
          Simulate a disruption on top of the current recovery plan and see
          exactly what moves — and by how much.
        </p>
      </div>

      <ScenarioSimulator />
    </div>
  );
}
