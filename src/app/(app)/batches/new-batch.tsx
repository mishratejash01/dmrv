"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Add16Regular,
  SpinnerIos16Regular,
} from "@/components/common/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Input, Textarea, NativeSelect, Field } from "@/components/ui/input";
import { createBatch } from "@/lib/actions/production";
import { BATCH_LIMITS, FEEDSTOCK_CATEGORIES, KILN_TYPES } from "@/lib/methodology";
import type { FeedstockCategory, KilnType } from "@/lib/types/db";

export function NewBatch({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [kilnType, setKilnType] = React.useState<KilnType>(KILN_TYPES[0].key);
  const [feedstock, setFeedstock] = React.useState("");
  const [tempProfile, setTempProfile] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function handleCreate() {
    setBusy(true);
    const res = await createBatch({
      project_id: projectId,
      kiln_type: kilnType,
      feedstock_category: feedstock ? (feedstock as FeedstockCategory) : null,
      temperature_profile: tempProfile || undefined,
      notes: notes || undefined,
    });
    setBusy(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Production batch opened");
      setOpen(false);
      setFeedstock("");
      setTempProfile("");
      setNotes("");
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Add16Regular className="h-4 w-4" /> New batch
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open a production batch</DialogTitle>
          <DialogDescription>
            One kiln type, one feedstock, one temperature curve. The batch stays valid for at most{" "}
            {BATCH_LIMITS.maxMonths} months or {BATCH_LIMITS.maxTonnes} tonnes — whichever comes
            first.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Kiln type" required>
            <NativeSelect value={kilnType} onChange={(e) => setKilnType(e.target.value as KilnType)}>
              {KILN_TYPES.map((k) => (
                <option key={k.key} value={k.key}>
                  {k.label}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Feedstock category" hint="Optional — leave blank if mixed within the approved list">
            <NativeSelect value={feedstock} onChange={(e) => setFeedstock(e.target.value)}>
              <option value="">— not specified —</option>
              {FEEDSTOCK_CATEGORIES.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field label="Temperature profile" hint="e.g. 550–620 °C flame-curtain curve">
            <Input
              value={tempProfile}
              onChange={(e) => setTempProfile(e.target.value)}
              placeholder="Describe the shared temperature curve"
            />
          </Field>

          <Field label="Notes">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything reviewers should know about this batch?"
            />
          </Field>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" disabled={busy}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleCreate} disabled={busy}>
            {busy ? <SpinnerIos16Regular className="h-4 w-4 animate-spin" /> : <Add16Regular className="h-4 w-4" />}
            Open batch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
