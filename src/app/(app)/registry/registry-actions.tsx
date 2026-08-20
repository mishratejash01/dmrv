"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  SpinnerIos16Regular,
  ApprovalsApp16Regular,
  Ribbon16Regular,
  Archive16Regular,
  ArrowSwap16Regular,
  ShieldCheckmark16Regular,
} from "@/components/common/icons";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";
import {
  createIssuance,
  approveAndIssue,
  retireCredit,
  transferCredit,
} from "@/lib/actions/registry";
import { fmt } from "@/lib/utils";

/** Step 1 of 2 — a registry admin initiates an issuance from a verified GHG quantification. */
export function InitiateIssuanceButton({
  ghgId,
  canIssue,
}: {
  ghgId: string;
  canIssue: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  if (!canIssue) return null;

  async function run() {
    setBusy(true);
    const res = await createIssuance(ghgId);
    setBusy(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(
        `Issuance initiated — ${fmt(res.gross ?? 0, 0)} gross tCO₂e, ${fmt(res.buffer ?? 0, 0)} to the buffer pool. A second registry admin must now approve.`,
      );
      router.refresh();
    }
  }

  return (
    <Button size="sm" onClick={run} disabled={busy}>
      {busy ? <SpinnerIos16Regular className="h-4 w-4 animate-spin" /> : <ApprovalsApp16Regular className="h-4 w-4" />}
      Initiate issuance
    </Button>
  );
}

/** Step 2 of 2 — a *different* registry admin approves and mints the serialised credits. */
export function ApproveIssuanceButton({
  issuanceId,
  canIssue,
  selfInitiated,
}: {
  issuanceId: string;
  canIssue: boolean;
  selfInitiated?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  if (!canIssue) return null;

  if (selfInitiated) {
    return (
      <Tooltip content="Two-person control — a different registry admin must approve this issuance.">
        <span className="inline-flex">
          <Button size="sm" variant="secondary" disabled>
            <ShieldCheckmark16Regular className="h-4 w-4" /> Awaiting second admin
          </Button>
        </span>
      </Tooltip>
    );
  }

  async function run() {
    setBusy(true);
    const res = await approveAndIssue(issuanceId);
    setBusy(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Credits issued — serial numbers are live on the ledger.");
      router.refresh();
    }
  }

  return (
    <Button size="sm" variant="sage" onClick={run} disabled={busy}>
      {busy ? <SpinnerIos16Regular className="h-4 w-4 animate-spin" /> : <Ribbon16Regular className="h-4 w-4" />}
      Approve &amp; issue
    </Button>
  );
}

/** Retire a credit to a beneficiary — permanent and irreversible. */
export function RetireCreditDialog({
  creditId,
  serial,
  canIssue,
}: {
  creditId: string;
  serial: string;
  canIssue: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [beneficiary, setBeneficiary] = React.useState("");
  const [reason, setReason] = React.useState("");
  if (!canIssue) return null;

  async function run() {
    if (!beneficiary.trim()) return toast.error("Name the beneficiary the credit is retired for.");
    if (!reason.trim()) return toast.error("Give a retirement reason.");
    setBusy(true);
    const res = await retireCredit(creditId, beneficiary.trim(), reason.trim());
    setBusy(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(`${serial} retired for ${beneficiary.trim()}.`);
      setOpen(false);
      setBeneficiary("");
      setReason("");
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Archive16Regular className="h-4 w-4" /> Retire
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Retire credit</DialogTitle>
          <DialogDescription>
            Retiring locks <span className="font-mono text-ink">{serial}</span> to a beneficiary
            forever. It can never be transferred or claimed again.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Beneficiary" required hint="Who claims the climate benefit">
            <Input
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
              placeholder="e.g. Acme Corp — FY2026 net-zero claim"
            />
          </Field>
          <Field label="Reason" required>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Voluntary offsetting of Scope 1 emissions"
            />
          </Field>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button variant="sage" onClick={run} disabled={busy}>
            {busy ? <SpinnerIos16Regular className="h-4 w-4 animate-spin" /> : <Archive16Regular className="h-4 w-4" />}
            Retire credit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Transfer a credit to a new holder. */
export function TransferCreditDialog({
  creditId,
  serial,
  currentHolder,
  canIssue,
}: {
  creditId: string;
  serial: string;
  currentHolder?: string | null;
  canIssue: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [toHolder, setToHolder] = React.useState("");
  if (!canIssue) return null;

  async function run() {
    if (!toHolder.trim()) return toast.error("Name the new holder.");
    setBusy(true);
    const res = await transferCredit(creditId, toHolder.trim());
    setBusy(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(`${serial} transferred to ${toHolder.trim()}.`);
      setOpen(false);
      setToHolder("");
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <ArrowSwap16Regular className="h-4 w-4" /> Transfer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer credit</DialogTitle>
          <DialogDescription>
            Move <span className="font-mono text-ink">{serial}</span>
            {currentHolder ? ` from ${currentHolder}` : ""} to a new holder. The move is recorded
            on the public transaction ledger.
          </DialogDescription>
        </DialogHeader>
        <Field label="New holder" required>
          <Input
            value={toHolder}
            onChange={(e) => setToHolder(e.target.value)}
            placeholder="e.g. Windward Climate Fund"
          />
        </Field>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button onClick={run} disabled={busy}>
            {busy ? <SpinnerIos16Regular className="h-4 w-4 animate-spin" /> : <ArrowSwap16Regular className="h-4 w-4" />}
            Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
