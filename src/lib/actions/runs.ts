"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { notify } from "@/lib/notify";

type Decision = "approved" | "rejected" | "changes_requested";

/** Reviewer action on a submitted run (developer / supervisor). RLS enforces the role. */
export async function reviewRun(runId: string, decision: Decision, notes?: string) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };
  const supabase = await createClient();

  const { data: run, error } = await supabase
    .from("kiln_runs")
    .update({
      status: decision,
      review_notes: notes ?? null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", runId)
    .select("id, code, operator_id, project_id")
    .single();

  if (error) return { error: error.message };

  if (run?.operator_id) {
    await notify({
      userId: run.operator_id,
      projectId: run.project_id,
      type: "review_request",
      title: `Run ${run.code ?? ""} ${decision.replace("_", " ")}`,
      body: notes || `Your kiln run was ${decision.replace("_", " ")}.`,
      link: `/runs/${run.id}`,
    });
  }

  revalidatePath("/review");
  revalidatePath("/runs");
  revalidatePath(`/runs/${runId}`);
  return { ok: true };
}

/** Assign / unassign a run to a production batch. */
export async function assignRunToBatch(runId: string, batchId: string | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("kiln_runs")
    .update({ production_batch_id: batchId })
    .eq("id", runId);
  if (error) return { error: error.message };
  revalidatePath(`/runs/${runId}`);
  revalidatePath("/batches");
  return { ok: true };
}
