import { DailyLoop } from "@/components/daily/daily-loop";

export default function TodayPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Daily loop</h1>
        <p className="text-muted-foreground">
          A crisis isn&apos;t planned once. Each morning: check in who showed
          up, take the plan, report what the floor actually did, and close the
          day. Unshipped orders roll over and re-rank, new orders arrive,
          partners requested yesterday come online.
        </p>
      </div>

      <DailyLoop />
    </div>
  );
}
