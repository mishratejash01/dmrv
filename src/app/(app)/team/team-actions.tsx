"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SpinnerIos16Regular } from "@/components/common/icons";
import { Button } from "@/components/ui/button";
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
import { Field, Input, NativeSelect } from "@/components/ui/input";
import { CopyButton } from "@/components/common/copy-button";
import { inviteMember, removeMember } from "@/lib/actions/team";
import { assignOperatorToSite } from "@/lib/actions/production";
import { PROJECT_ROLE_LABEL } from "@/lib/nav";
import type { ProjectRole } from "@/lib/types/db";

const ROLE_OPTIONS = Object.entries(PROJECT_ROLE_LABEL) as [ProjectRole, string][];

export interface SiteOption {
  id: string;
  name: string;
  code: string;
}

export interface OperatorOption {
  id: string;
  full_name: string;
  email: string;
}

/* ------------------------------ Invite member ------------------------------ */

export function InviteMemberDialog({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [role, setRole] = React.useState<ProjectRole>("kiln_operator");
  const [busy, setBusy] = React.useState(false);
  const [issued, setIssued] = React.useState<{ email: string; tempPassword: string } | null>(null);

  function reset() {
    setEmail("");
    setFullName("");
    setRole("kiln_operator");
    setIssued(null);
  }

  async function handleInvite() {
    if (!email.trim()) {
      toast.error("Enter an email address.");
      return;
    }
    setBusy(true);
    const res = await inviteMember({
      project_id: projectId,
      email: email.trim(),
      full_name: fullName.trim() || undefined,
      role,
    });
    setBusy(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    toast.success(`${res.email ?? email} added as ${PROJECT_ROLE_LABEL[role]}`);
    router.refresh();
    if (res.tempPassword) {
      setIssued({ email: res.email ?? email, tempPassword: res.tempPassword });
    } else {
      setOpen(false);
      reset();
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
           Invite member
        </Button>
      </DialogTrigger>
      <DialogContent>
        {issued ? (
          <>
            <DialogHeader>
              <DialogTitle>Share the temporary password</DialogTitle>
              <DialogDescription>
                An account was created for {issued.email}. Share this password over a secure
                channel — they should change it after their first sign-in.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium text-ink tnum">
                 {issued.tempPassword}
              </span>
              <CopyButton value={issued.tempPassword} label="Copy" />
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Invite a team member</DialogTitle>
              <DialogDescription>
                New people get an account with a temporary password; existing accounts are simply
                added to this project with the chosen role.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Field label="Email" required>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) =>setEmail(e.target.value)}
                  placeholder="name@example.org"
                  autoComplete="off"
                />
              </Field>
              <Field label="Full name" hint="Used when creating a new account">
                <Input
                  value={fullName}
                  onChange={(e) =>setFullName(e.target.value)}
                  placeholder="e.g. Asha Verma"
                />
              </Field>
              <Field
                label="Project role"
                required
                hint="Operators produce biochar; supervisors, developers and verifiers review it. Keep these duties separate."
              >
                <NativeSelect value={role} onChange={(e) =>setRole(e.target.value as ProjectRole)}>
                  {ROLE_OPTIONS.map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Cancel</Button>
              </DialogClose>
              <Button onClick={handleInvite} disabled={busy}>
                {busy ? <SpinnerIos16Regular className="h-4 w-4 animate-spin" /> : null}
                Invite
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------- Assign operator to site ------------------------ */

export function AssignOperatorDialog({
  sites,
  operators,
}: {
  sites: SiteOption[];
  operators: OperatorOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [siteId, setSiteId] = React.useState(sites[0]?.id ?? "");
  const [userId, setUserId] = React.useState(operators[0]?.id ?? "");
  const [busy, setBusy] = React.useState(false);

  const ready = sites.length > 0 && operators.length > 0;

  async function handleAssign() {
    if (!siteId || !userId) {
      toast.error("Pick both a site and an operator.");
      return;
    }
    setBusy(true);
    const res = await assignOperatorToSite(siteId, userId);
    setBusy(false);
    if (res?.error) {
      toast.error(
        res.error.toLowerCase().includes("duplicate")
          ? "That operator is already assigned to this site."
          : res.error,
      );
      return;
    }
    toast.success("Operator assigned to site");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
           Assign to site
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign an operator to a site</DialogTitle>
          <DialogDescription>
            Operators can only log kiln runs at sites they are assigned to.
          </DialogDescription>
        </DialogHeader>
        {ready ? (
          <div className="space-y-4">
            <Field label="Operator" required>
              <NativeSelect value={userId} onChange={(e) =>setUserId(e.target.value)}>
                {operators.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.full_name} ({o.email})
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Site" required>
              <NativeSelect value={siteId} onChange={(e) =>setSiteId(e.target.value)}>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
        ) : (
          <p className="text-sm text-muted">
            {operators.length === 0
              ? "Invite at least one kiln operator first."
              : "Add a site first — sites are managed under Sites & kilns."}
          </p>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={handleAssign} disabled={busy || !ready}>
            {busy ? <SpinnerIos16Regular className="h-4 w-4 animate-spin" /> : null}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ Remove member ------------------------------ */

export function RemoveMemberButton({
  membershipId,
  projectId,
  name,
  roleLabel,
}: {
  membershipId: string;
  projectId: string;
  name: string;
  roleLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function handleRemove() {
    setBusy(true);
    const res = await removeMember(membershipId, projectId);
    setBusy(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    toast.success(`${name} removed from the project`);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted hover:text-err"
          aria-label={`Remove ${name}`}
        >
          
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Remove {name}?</DialogTitle>
          <DialogDescription>
            This removes their {roleLabel} membership from the project. Historical records they
            created (runs, reviews, verifications) are kept for traceability.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button variant="danger" onClick={handleRemove} disabled={busy}>
            {busy ? <SpinnerIos16Regular className="h-4 w-4 animate-spin" /> : null}
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
