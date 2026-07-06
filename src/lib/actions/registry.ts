"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { notifyProjectRoles } from "@/lib/notify";
import { bufferContribution } from "@/lib/rcc";

/** Registry admin initiates an issuance from a GHG quantification (step 1 of 2). */
export async function createIssuance(ghgId: string) {
  const user = await getUser();
  const supabase = await createClient();

  const { data: ghg, error: gErr } = await supabase
    .from("ghg_quantifications")
    .select("id, production_batch_id, credit_type, net_co2_removed_tco2e, production_batches!inner(project_id)")
    .eq("id", ghgId)
    .single();
  if (gErr || !ghg) return { error: gErr?.message ?? "Quantification not found" };

  const projectId = (ghg.production_batches as { project_id: string }).project_id;
  const { data: project } = await supabase
    .from("projects")
    .select("country_code, buffer_pool_pct")
    .eq("id", projectId)
    .single();

  const { data: verification } = await supabase
    .from("verifications")
    .select("id, status")
    .eq("production_batch_id", ghg.production_batch_id)
    .eq("status", "approved")
    .maybeSingle();

  const gross = Math.floor(Number(ghg.net_co2_removed_tco2e));
  if (gross <= 0) return { error: "Net removal is below one whole credit." };
  const buffer = bufferContribution(gross);
  const net = gross - buffer;
  const vintage = new Date().getFullYear();

  const { data, error } = await supabase
    .from("rcc_issuances")
    .insert({
      project_id: projectId,
      verification_id: verification?.id ?? null,
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
  const supabase = await createClient();

  const { error: upErr } = await supabase
    .from("rcc_issuances")
    .update({ approved_by: user?.id ?? null, status: "approved" })
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
