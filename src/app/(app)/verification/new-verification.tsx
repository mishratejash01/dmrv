"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, NativeSelect, Field } from "@/components/ui/input";
import { createVerification } from "@/lib/actions/verification";

interface Props {
  projectId: string;
  batches: { id: string; code: string }[];
  verifiers: { id: string; name: string }[];
}

export function NewVerification({ projectId, batches, verifiers }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [batchId, setBatchId] = React.useState(batches[0]?.id ?? "");
  const [verifierId, setVerifierId] = React.useState(verifiers[0]?.id ?? "");
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [auditType, setAuditType] = React.useState<"remote" | "in_person">("remote");

  async function handleSubmit() {
    if (!batchId) return toast.error("Choose the production batch to verify.");
    if (!verifierId) return toast.error("Assign a verifier.");
    if (start && end && end < start)
      return toast.error("The monitoring period end must be after its start.");

    setBusy(true);
    const res = await createVerification({
      project_id: projectId,
      production_batch_id: batchId,
      verifier_id: verifierId,
      monitoring_period_start: start || undefined,
      monitoring_period_end: end || undefined,
      audit_type: auditType,
    });
    setBusy(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Verification assigned");
      setOpen(false);
      setStart("");
      setEnd("");
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <ClipboardCheck className="h-4 w-4" /> Request verification
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a verification</DialogTitle>
          <DialogDescription>
            Assign an independent verifier to audit a production batch&apos;s evidence chain for a
            monitoring period before credits can be issued.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Production batch" required hint={batches.length === 0 ? "No batches to verify yet" : undefined}>
            <NativeSelect value={batchId} onChange={(e) => setBatchId(e.target.value)}>
              <option value="">— select a batch —</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>{b.code}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Verifier" required hint={verifiers.length === 0 ? "No verifiers on this project" : undefined}>
            <NativeSelect value={verifierId} onChange={(e) => setVerifierId(e.target.value)}>
              <option value="">— select a verifier —</option>
              {verifiers.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Monitoring period start">
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label="Monitoring period end">
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </Field>
          </div>
          <Field label="Audit type" required>
            <NativeSelect
              value={auditType}
              onChange={(e) => setAuditType(e.target.value as "remote" | "in_person")}
            >
              <option value="remote">Remote audit</option>
              <option value="in_person">In-person site audit</option>
            </NativeSelect>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Assign verification
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
