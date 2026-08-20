"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  SpinnerIos20Regular,
  Add20Regular,
  Checkmark20Regular,
  ThumbLike20Regular,
  ThumbDislike20Regular,
} from "@/components/common/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, Textarea, NativeSelect, Field } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { addFinding, resolveFinding, decideVerification } from "@/lib/actions/verification";
import { humanize } from "@/lib/utils";

type Severity = "low" | "medium" | "high" | "critical";

interface Finding {
  id: string;
  category: string;
  severity: string;
  description: string;
  status: string;
}

interface Props {
  verificationId: string;
  canDecide: boolean;
  status: string;
  findings?: Finding[];
}

const SEVERITIES: { key: Severity; label: string }[] = [
  { key: "low", label: "Low" },
  { key: "medium", label: "Medium" },
  { key: "high", label: "High" },
  { key: "critical", label: "Critical" },
];

export function VerificationActions({ verificationId, canDecide, status, findings = [] }: Props) {
  if (!canDecide) return null;

  const decided = status === "approved" || status === "rejected";
  const openFindings = findings.filter((f) => f.status === "open");

  return (
    <Card className="no-print">
      <CardHeader>
        <CardTitle>Verifier actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {decided ? (
          <div className="rounded-lg border border-border bg-surface/60 px-3 py-2.5 text-sm text-muted">
            This verification has been{" "}
            <span className="font-medium text-ink-soft">{humanize(status)}</span>. The decision is
            recorded on the evidence package above.
          </div>
        ) : (
          <>
            <AddFindingDialog verificationId={verificationId} />

            {openFindings.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted mb-2">Open findings</p>
                <div className="space-y-2">
                  {openFindings.map((f) => (
                    <ResolveRow key={f.id} finding={f} verificationId={verificationId} />
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <DecideDialog verificationId={verificationId} decision="approved" openFindings={openFindings.length} />
              <DecideDialog verificationId={verificationId} decision="rejected" openFindings={openFindings.length} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ResolveRow({ finding, verificationId }: { finding: Finding; verificationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function resolve() {
    setBusy(true);
    const res = await resolveFinding(finding.id, verificationId);
    setBusy(false);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Finding resolved");
      router.refresh();
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface/40 px-3 py-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <StatusBadge kind="severity" value={finding.severity} />
          <span className="text-sm text-ink-soft truncate">{humanize(finding.category)}</span>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={resolve} disabled={busy}>
        {busy ? <SpinnerIos20Regular className="h-4 w-4 animate-spin" /> : <Checkmark20Regular className="h-4 w-4" />} Resolve
      </Button>
    </div>
  );
}

function AddFindingDialog({ verificationId }: { verificationId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [category, setCategory] = React.useState("");
  const [severity, setSeverity] = React.useState<Severity>("low");
  const [description, setDescription] = React.useState("");
  const [relatedEntity, setRelatedEntity] = React.useState("");

  async function handleSubmit() {
    if (!category.trim()) return toast.error("Give the finding a category.");
    if (!description.trim()) return toast.error("Describe the finding.");
    setBusy(true);
    const res = await addFinding({
      verification_id: verificationId,
      category: category.trim(),
      severity,
      description: description.trim(),
      related_entity: relatedEntity.trim() || undefined,
    });
    setBusy(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Finding raised");
      setOpen(false);
      setCategory("");
      setDescription("");
      setRelatedEntity("");
      setSeverity("low");
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="w-full">
          <Add20Regular className="h-4 w-4" /> Raise a finding
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Raise a verification finding</DialogTitle>
          <DialogDescription>
            Record a non-conformity or issue in the evidence chain. Findings should be resolved
            before the verification is approved.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Category" required hint="e.g. Sampling, GHG, Feedstock">
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Category"
              />
            </Field>
            <Field label="Severity" required>
              <NativeSelect value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
                {SEVERITIES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field label="Description" required>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is the issue and what evidence supports it?"
            />
          </Field>
          <Field label="Related entity" hint="Run code, sample id, document reference…">
            <Input
              value={relatedEntity}
              onChange={(e) => setRelatedEntity(e.target.value)}
              placeholder="e.g. Run KR-0142"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy && <SpinnerIos20Regular className="h-4 w-4 animate-spin" />} Raise finding
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DecideDialog({
  verificationId,
  decision,
  openFindings,
}: {
  verificationId: string;
  decision: "approved" | "rejected";
  openFindings: number;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [summary, setSummary] = React.useState("");

  const isApprove = decision === "approved";

  async function handleSubmit() {
    setBusy(true);
    const res = await decideVerification(verificationId, decision, summary.trim() || undefined);
    setBusy(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(`Verification ${decision}`);
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={isApprove ? "sage" : "danger"} className="w-full">
          {isApprove ? <ThumbLike20Regular className="h-4 w-4" /> : <ThumbDislike20Regular className="h-4 w-4" />}
          {isApprove ? "Approve" : "Reject"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isApprove ? "Approve verification" : "Reject verification"}</DialogTitle>
          <DialogDescription>
            {isApprove
              ? "Confirm that the evidence chain is complete and accurate. On approval the batch is marked verified and cleared for issuance."
              : "Record why this verification cannot be approved. The developer will be notified."}
          </DialogDescription>
        </DialogHeader>
        {isApprove && openFindings > 0 && (
          <div className="rounded-lg border border-ochre-soft bg-warn-tint px-3 py-2.5 text-sm text-[#8a5200]">
            {openFindings} finding{openFindings === 1 ? "" : "s"} still open. Consider resolving
            them before approving.
          </div>
        )}
        <div className="space-y-4">
          <Field label={isApprove ? "Summary" : "Reason"} hint="Recorded on the verification package">
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={
                isApprove
                  ? "The evidence chain was reviewed and found complete…"
                  : "The verification is rejected because…"
              }
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant={isApprove ? "sage" : "danger"} onClick={handleSubmit} disabled={busy}>
            {busy && <SpinnerIos20Regular className="h-4 w-4 animate-spin" />}
            {isApprove ? "Approve verification" : "Reject verification"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
