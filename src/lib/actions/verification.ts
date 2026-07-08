"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { notify, notifyProjectRoles } from "@/lib/notify";

export async function createVerification(input: {
  project_id: string;
  production_batch_id?: string | null;
  verifier_id?: string | null;
  monitoring_period_start?: string;
  monitoring_period_end?: string;
  audit_type?: string;
}) {
  const user = await getUser();
  const supabase = await createClient();

  // A batch is only ready for verification once it's closed/testing.
  if (input.production_batch_id) {
    const { data: b } = await supabase
      .from("production_batches")
      .select("status")
      .eq("id", input.production_batch_id)
      .single();
    if (b && !["closed", "testing"].includes(b.status)) {
      return { error: `A ${b.status} batch cannot be sent for verification — close it first.` };
    }
  }

  const { data, error } = await supabase
    .from("verifications")
    .insert({
      ...input,
      status: "assigned",
      audit_type: input.audit_type ?? "remote",
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  if (input.verifier_id) {
    await notify({
      userId: input.verifier_id,
      projectId: input.project_id,
      type: "verification_status",
      title: "New verification assigned",
      body: "A monitoring period is ready for your review.",
      link: `/verification/${data?.id}`,
    });
  }
  revalidatePath("/verification");
  return { ok: true, id: data?.id };
}

export async function addFinding(input: {
  verification_id: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  related_entity?: string;
}) {
  const user = await getUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("verification_findings")
    .insert({ ...input, status: "open", created_by: user?.id ?? null });
  if (error) return { error: error.message };
  revalidatePath(`/verification/${input.verification_id}`);
  return { ok: true };
}

export async function resolveFinding(findingId: string, verificationId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("verification_findings")
    .update({ status: "resolved" })
    .eq("id", findingId);
  if (error) return { error: error.message };
  revalidatePath(`/verification/${verificationId}`);
  return { ok: true };
}

export async function decideVerification(
  verificationId: string,
  decision: "approved" | "rejected",
  summary?: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("verifications")
    .update({
      status: decision,
      summary: summary ?? null,
      decided_at: new Date().toISOString(),
    })
    .eq("id", verificationId)
    .select("id, project_id, production_batch_id")
    .single();
  if (error) return { error: error.message };

  if (decision === "approved" && data?.production_batch_id) {
    // A verifier lacks can_review, so a direct UPDATE would silently no-op under
    // RLS. Flip the batch via a SECURITY DEFINER RPC guarded to the assigned verifier.
    const { error: vErr } = await supabase.rpc("fn_verify_batch", { p_verification: verificationId });
    if (vErr) return { error: vErr.message };
  }
  if (data?.project_id) {
    await notifyProjectRoles({
      projectId: data.project_id,
      roles: ["project_developer"],
      type: "verification_status",
      title: `Verification ${decision}`,
      body: summary || `The verification was ${decision}.`,
      link: `/verification/${verificationId}`,
    });
  }
  revalidatePath("/verification");
  revalidatePath(`/verification/${verificationId}`);
  return { ok: true };
}
