"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SpinnerIos16Regular } from "@/components/common/icons";
import { reviewRun } from "@/lib/actions/runs";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Decision = "approved" | "rejected" | "changes_requested";

const META: Record<
  Decision,
  {
    label: string;
    variant: ButtonProps["variant"];
    title: string;
    description: string;
    confirm: string;
    done: string;
  }
> = {
  approved: {
    label: "Approve",
    variant: "sage",
    title: "Approve this run",
    description:
      "The run becomes eligible for batching and downstream GHG quantification.",
    confirm: "Approve run",
    done: "Run approved",
  },
  changes_requested: {
    label: "Request changes",
    variant: "secondary",
    title: "Request changes",
    description:
      "The operator is notified and can amend the record and resubmit for review.",
    confirm: "Request changes",
    done: "Changes requested",
  },
  rejected: {
    label: "Reject",
    variant: "danger",
    title: "Reject this run",
    description:
      "The run is excluded from batching. Reserve this for invalid or unverifiable evidence.",
    confirm: "Reject run",
    done: "Run rejected",
  },
};

/** Approve / request-changes / reject buttons for a submitted kiln run. */
export function ReviewActions({
  runId,
  size = "md",
}: {
  runId: string;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [decision, setDecision] = React.useState<Decision | null>(null);
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const meta = decision ? META[decision] : null;

  function start(d: Decision) {
    setNotes("");
    setDecision(d);
  }

  async function confirm() {
    if (!decision) return;
    setBusy(true);
    const res = await reviewRun(runId, decision, notes.trim() || undefined);
    setBusy(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(META[decision].done);
      setDecision(null);
      router.refresh();
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(META) as Decision[]).map((d) => {
          const m = META[d];
          return (
            <Button key={d} variant={m.variant} size={size} onClick={() => start(d)}>
              {m.label}
            </Button>
          );
        })}
      </div>

      <Dialog open={decision !== null} onOpenChange={(open) => !open && setDecision(null)}>
        <DialogContent>
          {meta && (
            <>
              <DialogHeader>
                <DialogTitle>{meta.title}</DialogTitle>
                <DialogDescription>{meta.description}</DialogDescription>
              </DialogHeader>
              <Field
                label="Notes for the operator"
                hint="Optional — included in the operator's notification."
              >
                <Textarea
                  value={notes}
                  onChange={(e) =>setNotes(e.target.value)}
                  placeholder="e.g. Quench photo is blurry — please retake."
                />
              </Field>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost" disabled={busy}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button variant={meta.variant} onClick={confirm} disabled={busy}>
                  {busy && <SpinnerIos16Regular className="h-4 w-4 animate-spin" />}
                  {meta.confirm}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
