"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { notifyProjectRoles } from "@/lib/notify";
import { BUFFER_POOL } from "@/lib/methodology";

/** Registry admin initiates an issuance from a GHG quantification (step 1 of 2). */
export async function createIssuance(ghgId: string) {
  const user = await getUser();
  const supabase = await createClient();

  const { data: ghg, error: gErr } = await supabase
    .from("ghg_quantifications")
    .select(
      "id, production_batch_id, credit_type, net_co2_removed_tco2e, eligible, production_batches!inner(project_id, status, opened_at, closed_at)",
    )
    .eq("id", ghgId)
    .single();
  if (gErr || !ghg) return { error: gErr?.message ?? "Quantification not found" };

  const batch = ghg.production_batches as {
    project_id: string;
    status: string;
    opened_at: string;
    closed_at: string | null;
  };

  // --- Server-side gates (not just UI): eligibility, verified batch, approved
  // verification, and no duplicate issuance for the batch. ---
  if (ghg.eligible === false) {
    return { error: "This batch is ineligible (H/C_org ≥ 0.7) and cannot be issued as removal credits." };
  }
  if (batch.status !== "verified") {
    return { error: "Only a verified batch can be issued into credits." };
  }
  const { data: verification } = await supabase
    .from("verifications")
    .select("id")
    .eq("production_batch_id", ghg.production_batch_id)
    .eq("status", "approved")
    .maybeSingle();
  if (!verification) {
    return { error: "No approved verification exists for this batch." };
  }
  const { count: existing } = await supabase
    .from("rcc_issuances")
    .select("id", { count: "exact", head: true })
    .eq("production_batch_id", ghg.production_batch_id);
  if ((existing ?? 0) > 0) {
    return { error: "This batch has already been issued." };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("country_code, buffer_pool_pct")
    .eq("id", batch.project_id)
    .single();

  const gross = Math.floor(Number(ghg.net_co2_removed_tco2e));
  if (gross <= 0) return { error: "Net removal is below one whole credit." };

  // Buffer = the project's configured rate, never below the 2% methodology floor.
  const bufferFraction = Math.max(
    Number(project?.buffer_pool_pct ?? 0) / 100,
    BUFFER_POOL.minFraction,
  );
  const buffer = ghg.credit_type === "removal" ? Math.ceil(gross * bufferFraction) : 0;
  const net = gross - buffer;
  // Vintage = the year the biochar was produced (batch close), not the issuance date.
  const vintage = new Date(batch.closed_at ?? batch.opened_at ?? new Date()).getFullYear();

  const { data, error } = await supabase
    .from("rcc_issuances")
    .insert({
      project_id: batch.project_id,
      verification_id: verification.id,
      production_batch_id: ghg.production_batch_id,
      ghg_quantification_id: ghg.id,
      credit_type: ghg.credit_type,
      vintage,
      geography: project?.country_code ?? "IN",
      gross_tco2e: gross,
      buffer_tco2e: buffer,
      net_issued_tco2e: net,
      status: "initiated",
      initiated_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/registry");
  return { ok: true, id: data?.id, gross, buffer, net };
}

/** Registry admin approves & issues (step 2 of 2, two-person control). */
export async function approveAndIssue(issuanceId: string) {
  const user = await getUser();
  if (!user) return { error: "Not authenticated" };
  const supabase = await createClient();

  // Two-person control, enforced server-side (not just the disabled button):
  // the approver must be a different registry admin than the initiator, and the
  // issuance must still be awaiting approval.
  const { data: iss0 } = await supabase
    .from("rcc_issuances")
    .select("initiated_by, status")
    .eq("id", issuanceId)
    .single();
  if (!iss0) return { error: "Issuance not found" };
  if (iss0.status !== "initiated") return { error: "This issuance has already been processed." };
  if (iss0.initiated_by === user.id) {
    return { error: "Two-person control: a different registry admin must approve the issuance you initiated." };
  }

  const { error: upErr } = await supabase
    .from("rcc_issuances")
    .update({ approved_by: user.id, status: "approved" })
    .eq("id", issuanceId);
  if (upErr) return { error: upErr.message };

  const { data: count, error } = await supabase.rpc("fn_issue_credits", { p_issuance: issuanceId });
  if (error) return { error: error.message };

  const { data: iss } = await supabase
    .from("rcc_issuances")
    .select("project_id, net_issued_tco2e")
    .eq("id", issuanceId)
    .single();
  if (iss?.project_id) {
    await notifyProjectRoles({
      projectId: iss.project_id,
      roles: ["project_developer"],
      type: "issuance",
      title: "Rainbow Carbon Credits issued",
      body: `${iss.net_issued_tco2e} removal RCCs issued to your project.`,
      link: "/registry",
    });
  }
  revalidatePath("/registry");
  return { ok: true, issued: count };
}

export async function retireCredit(creditId: string, beneficiary: string, reason: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("fn_retire_credit", {
    p_credit: creditId,
    p_beneficiary: beneficiary,
    p_reason: reason,
  });
  if (error) return { error: error.message };
  revalidatePath("/registry");
  return { ok: true };
}

export async function transferCredit(creditId: string, toHolder: string) {
  const user = await getUser();
  const supabase = await createClient();
  const { data: credit } = await supabase
    .from("rcc_credits")
    .select("current_holder, issuance_id, project_id, status")
    .eq("id", creditId)
    .single();
  if (!credit) return { error: "Credit not found" };
  if (credit.status === "retired") return { error: "Retired credits cannot be transferred." };

  const { error } = await supabase
    .from("rcc_credits")
    .update({ status: "transferred", current_holder: toHolder })
    .eq("id", creditId);
  if (error) return { error: error.message };

  await supabase.from("credit_transactions").insert({
    credit_id: creditId,
    issuance_id: credit.issuance_id,
    project_id: credit.project_id,
    txn_type: "transfer",
    from_holder: credit.current_holder,
    to_holder: toHolder,
    actor_id: user?.id ?? null,
  });
  revalidatePath("/registry");
  return { ok: true };
}
