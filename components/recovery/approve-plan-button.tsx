"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Manager approval is a local, per-viewer interaction for this prototype —
// there's no backend to persist it to (see plan.md section 2: "real
// employee scheduling or payroll" and live system integrations are
// explicitly out of scope).
export function ApprovePlanButton() {
  const [approved, setApproved] = useState(false);

  if (approved) {
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-500">
        <CheckCircle2 className="h-4 w-4" />
        Plan approved
      </div>
    );
  }

  return (
    <Button onClick={() => setApproved(true)}>Approve this plan</Button>
  );
}
