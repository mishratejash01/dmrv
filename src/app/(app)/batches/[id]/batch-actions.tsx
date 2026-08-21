"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SpinnerIos16Regular } from "@/components/common/icons";
import { setBatchStatus } from "@/lib/actions/production";
import { createVerification } from "@/lib/actions/verification";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const AUDIT_TYPES = [
  { key: "remote", label: "Remote audit" },
  { key: "in_person", label: "In-person audit" },
] as const;

/** Reviewer controls for a production batch: close it, request verification. */
export function BatchActions({
  batchId,
  projectId,
  status,
  openedAt,
  closedAt,
  canReview,
  verifiers,
}: {
  batchId: string;
  projectId: string;
  status: string;
  openedAt: string;
  closedAt: string | null;
  canReview: boolean;
  verifiers: { id: string; name: string }[];
}) {
  if (!canReview) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "open" && <CloseBatchButton batchId={batchId} />}
      {/* A batch is sent for verification once closed/testing — not while open,
          and not once already verified. */}
      {(status === "closed" || status === "testing") && (
        <RequestVerificationDialog
          batchId={batchId}
          projectId={projectId}
          openedAt={openedAt}
          closedAt={closedAt}
          verifiers={verifiers}
        />
      )}
    </div>
  );
}

function CloseBatchButton({ batchId }: { batchId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function close() {
    setBusy(true);
    const res = await setBatchStatus(batchId, "closed");
    setBusy(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Batch closed");
      router.refresh();
    }
  }

  return (
    <Button variant="secondary" onClick={close} disabled={busy}>
      {busy ? <SpinnerIos16Regular className="h-4 w-4 animate-spin" /> : null}
      Close batch
    </Button>
  );
}

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function RequestVerificationDialog({
  batchId,
  projectId,
  openedAt,
  closedAt,
  verifiers,
}: {
  batchId: string;
  projectId: string;
  openedAt: string;
  closedAt: string | null;
  verifiers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [verifierId, setVerifierId] = React.useState(verifiers[0]?.id ?? "");
  const [periodStart, setPeriodStart] = React.useState(toDateInput(openedAt));
  const [periodEnd, setPeriodEnd] = React.useState(
    toDateInput(closedAt ?? new Date().toISOString()),
  );
  const [auditType, setAuditType] = React.useState<string>(AUDIT_TYPES[0].key);

  async function handleSubmit() {
    if (!periodStart || !periodEnd) return toast.error("Set the monitoring period.");
    if (periodEnd < periodStart)
      return toast.error("The monitoring period end must be after its start.");
    setBusy(true);
    const res = await createVerification({
      project_id: projectId,
      production_batch_id: batchId,
      verifier_id: verifierId || null,
      monitoring_period_start: periodStart,
      monitoring_period_end: periodEnd,
      audit_type: auditType,
    });
    setBusy(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Verification requested");
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
           Request verification
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request verification</DialogTitle>
          <DialogDescription>
            Assign an accredited verifier to audit this batch over a monitoring period.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field
            label="Verifier"
            hint={verifiers.length === 0 ? "No verifiers on this project yet" : "Notified on assignment"}
          >
            <NativeSelect value={verifierId} onChange={(e) =>setVerifierId(e.target.value)}>
              <option value="">— unassigned —</option>
              {verifiers.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Monitoring period start" required>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) =>setPeriodStart(e.target.value)}
              />
            </Field>
            <Field label="Monitoring period end" required>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) =>setPeriodEnd(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Audit type" required>
            <NativeSelect value={auditType} onChange={(e) =>setAuditType(e.target.value)}>
              {AUDIT_TYPES.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={busy}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy && <SpinnerIos16Regular className="h-4 w-4 animate-spin" />} Request verification
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
