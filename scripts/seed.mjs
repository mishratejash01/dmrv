// ===========================================================================
// Acres dMRV — demo data seed.
// Creates a realistic, fully-explorable distributed open-kiln biochar project.
// Usage:  node --env-file=.env.local scripts/seed.mjs
// Idempotent: wipes the demo project + demo users, then recreates everything.
// ===========================================================================
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

const PASSWORD = "AcresDemo!26";
const PROJECT_CODE = "P001";

// --- deterministic pseudo-random (no Date.now / Math.random for reproducibility) ---
let _seed = 1337;
const rand = () => {
  _seed = (_seed * 1103515245 + 12345) & 0x7fffffff;
  return _seed / 0x7fffffff;
};
const between = (a, b) => a + (b - a) * rand();
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const round = (n, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;

const must = (label, { error, data }) => {
  if (error) {
    console.error(`✗ ${label}:`, error.message || error);
    process.exit(1);
  }
  return data;
};

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
const USERS = [
  { key: "admin", email: "admin@dmrv.demo", name: "System Administrator", global: "super_admin", org: "Acres Climate Tech" },
  { key: "registry", email: "registry@dmrv.demo", name: "Acres Credit Registry", global: "registry_admin", org: "Acres Climate Tech" },
  { key: "developer", email: "developer@dmrv.demo", name: "Ananya Deshpande", global: "member", org: "Deccan Biochar Cooperative" },
  { key: "supervisor", email: "supervisor@dmrv.demo", name: "Rohan Kulkarni", global: "member", org: "Deccan Biochar Cooperative" },
  { key: "operator", email: "operator@dmrv.demo", name: "Kabir Sable", global: "member", org: "Deccan Biochar Cooperative" },
  { key: "operator2", email: "operator2@dmrv.demo", name: "Meera Pawar", global: "member", org: "Deccan Biochar Cooperative" },
  { key: "verifier", email: "verifier@dmrv.demo", name: "Dr. Lena Fischer", global: "member", org: "TÜV Carbon Assurance (VVB)" },
];

async function wipe() {
  console.log("→ wiping previous demo data …");
  // delete demo project (cascades to all children)
  await db.from("projects").delete().eq("code", PROJECT_CODE);
  // delete demo auth users
  let page = 1;
  const emails = new Set(USERS.map((u) => u.email));
  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    for (const u of data.users) if (emails.has(u.email)) await db.auth.admin.deleteUser(u.id);
    if (data.users.length < 200) break;
    page += 1;
  }
}

async function createUsers() {
  const ids = {};
  for (const u of USERS) {
    const created = must(
      `create user ${u.email}`,
      await db.auth.admin.createUser({
        email: u.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: u.name, global_role: u.global, organization: u.org },
      }),
    );
    ids[u.key] = created.user.id;
    // ensure profile reflects role/org (trigger created the base row)
    must(
      `profile ${u.email}`,
      await db.from("profiles").update({
        full_name: u.name,
        global_role: u.global,
        organization: u.org,
      }).eq("id", created.user.id),
    );
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Placeholder evidence images (warm-themed SVGs uploaded once, shared by path)
// ---------------------------------------------------------------------------
function svg(title, subtitle, from, to, glyph) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
  <rect width="800" height="600" fill="url(#g)"/>
  <text x="400" y="300" font-family="Georgia, serif" font-size="180" text-anchor="middle" fill="#fffdf9" opacity="0.92">${glyph}</text>
  <text x="400" y="430" font-family="Georgia, serif" font-size="42" text-anchor="middle" fill="#fffdf9">${title}</text>
  <text x="400" y="475" font-family="sans-serif" font-size="22" text-anchor="middle" fill="#fffdf9" opacity="0.85">${subtitle}</text>
</svg>`;
}
const IMAGES = {
  "demo/pyrolysis.svg": svg("Pyrolysis", "Clean flame-curtain burn", "#b0805699", "#7a5230", "🔥"),
  "demo/flame_curtain.svg": svg("Flame curtain", "Gases combusted at the rim", "#c9a24b99", "#8a6a1f", "🌋"),
  "demo/quench.svg": svg("Quenching", "Rapid water cooling", "#6f828699", "#3f5256", "💧"),
  "demo/end_use.svg": svg("End use", "Soil incorporation", "#8a9a7b99", "#556042", "🌱"),
  "demo/site.svg": svg("Site visit", "Supervisor QA", "#b0805699", "#5c5346", "📋"),
};

async function uploadImages() {
  for (const [path, body] of Object.entries(IMAGES)) {
    const bucket = path.includes("end_use") ? "end-use-proof" : path.includes("site") ? "site-audit-photos" : "run-photos";
    await db.storage.from(bucket).upload(path, new Blob([body], { type: "image/svg+xml" }), {
      contentType: "image/svg+xml",
      upsert: true,
    });
  }
}

// ---------------------------------------------------------------------------
// Main seed
// ---------------------------------------------------------------------------
async function main() {
  await wipe();
  const uid = await createUsers();
  await uploadImages();
  console.log("→ users & evidence ready");

  // --- Project ---
  const project = must("project", await db.from("projects").insert({
    name: "Deccan Biochar Cooperative",
    code: PROJECT_CODE,
    developer_id: uid.developer,
    methodology: "RBW-BCR-DOB-V1.0",
    pdd_reference: "PDD-DECCAN-2026-01",
    country_code: "IN",
    region: "Maharashtra, India",
    crediting_period_start: "2026-01-01",
    crediting_period_end: "2030-12-31",
    monitoring_period_months: 12,
    buffer_pool_pct: 2.0,
    durability_pathway: "years_100",
    soil_temp_c: 24.0,
    description:
      "A distributed open-kiln biochar cooperative converting sugarcane bagasse, rice husk and cotton-stalk residues into durable soil carbon across smallholder farms in western Maharashtra.",
    status: "active",
  }).select().single());
  const projectId = project.id;

  // --- Members ---
  const members = [
    { user_id: uid.developer, role: "project_developer" },
    { user_id: uid.supervisor, role: "kiln_supervisor" },
    { user_id: uid.operator, role: "kiln_operator" },
    { user_id: uid.operator2, role: "kiln_operator" },
    { user_id: uid.verifier, role: "verifier" },
  ].map((m) => ({ ...m, project_id: projectId }));
  must("members", await db.from("project_members").insert(members));

  // --- Sites ---
  const siteDefs = [
    { name: "Baramati Field Station", code: "S1", latitude: 18.1514, longitude: 74.5772, region: "Baramati", operator: uid.operator },
    { name: "Indapur Cooperative Yard", code: "S2", latitude: 18.1189, longitude: 75.0286, region: "Indapur", operator: uid.operator2 },
    { name: "Phaltan Agro Hub", code: "S3", latitude: 17.9836, longitude: 74.4300, region: "Phaltan", operator: uid.operator },
  ];
  const sites = [];
  for (const s of siteDefs) {
    const row = must(`site ${s.code}`, await db.from("sites").insert({
      project_id: projectId, name: s.name, code: s.code,
      latitude: s.latitude, longitude: s.longitude, region: s.region,
      address: `${s.region}, Pune district, Maharashtra`,
      supply_envelope: "12 km radius of cooperative farms; sugarcane & cotton residues",
      previous_cropping: "Sugarcane–cotton rotation, rainfed & canal-irrigated",
      status: "active",
    }).select().single());
    sites.push({ ...row, operator: s.operator });
    must("site assign", await db.from("site_assignments").insert({ site_id: row.id, user_id: s.operator }));
    must("site assign sup", await db.from("site_assignments").insert({ site_id: row.id, user_id: uid.supervisor }));
  }

  // --- Kilns (2 per site) ---
  const kilns = [];
  for (const s of sites) {
    for (let k = 1; k <= 2; k++) {
      const row = must("kiln", await db.from("kilns").insert({
        site_id: s.id, project_id: projectId,
        name: `${s.code} Kon-Tiki ${k}`, code: `${s.code}-K${k}`,
        kiln_type: "flame_curtain_cone",
        capacity_kg: 1200,
        sop_reference: "SOP-OPENKILN-KT-2026",
        specifications: { shape: "cone", diameter_m: 2.2, depth_m: 1.1, material: "steel" },
        status: "active",
      }).select().single());
      kilns.push({ ...row, siteOperator: s.operator, siteLat: s.latitude, siteLng: s.longitude });
    }
  }

  // --- Approved feedstocks ---
  const feedDefs = [
    { name: "Sugarcane bagasse", category: "ag_residue_no_value", carbon_fraction: 0.47, proof_method: "positive_list" },
    { name: "Rice husk", category: "ag_residue_no_value", carbon_fraction: 0.42, proof_method: "positive_list" },
    { name: "Cotton stalks", category: "ag_residue_no_value", carbon_fraction: 0.45, proof_method: "contextual" },
    { name: "Pruned orchard wood", category: "forest_managed", carbon_fraction: 0.5, forestry_certification: "FSC", proof_method: "price" },
    { name: "Prosopis juliflora (invasive)", category: "invasive_species", carbon_fraction: 0.48, proof_method: "positive_list" },
  ];
  const feedstocks = [];
  for (const f of feedDefs) {
    const row = must("approved feedstock", await db.from("approved_feedstocks").insert({
      project_id: projectId, ...f, active: true,
      notes: "Documented via delivery receipts and field photos.",
    }).select().single());
    feedstocks.push(row);
  }

  // --- Feedstock deliveries ---
  const deliveries = [];
  const deliveryDates = ["2026-01-08", "2026-01-22", "2026-02-10", "2026-03-01", "2026-06-18", "2026-06-30"];
  for (let i = 0; i < deliveryDates.length; i++) {
    const f = feedstocks[i % feedstocks.length];
    const s = sites[i % sites.length];
    const weight = round(between(3000, 9000), 0);
    const row = must("feedstock batch", await db.from("feedstock_batches").insert({
      project_id: projectId, site_id: s.id, approved_feedstock_id: f.id,
      source: `${s.region} cooperative farms`, category: f.category,
      weight_kg: weight, moisture_pct: round(between(10, 18), 1),
      source_area_description: "Smallholder plots within the site supply envelope",
      received_at: `${deliveryDates[i]}T08:00:00Z`, recorded_by: s.operator,
    }).select().single());
    deliveries.push({ ...row, carbon_fraction: f.carbon_fraction });
  }

  // --- Production batches ---
  const batch1 = must("batch1", await db.from("production_batches").insert({
    project_id: projectId, code: "PB-2026-01", kiln_type: "flame_curtain_cone",
    feedstock_category: "ag_residue_no_value", temperature_profile: "480–620 °C, ~2 h residence",
    opened_at: "2026-01-10T06:00:00Z", closed_at: "2026-04-15T18:00:00Z",
    status: "open",
    notes: "First verified batch — bagasse & cotton stalk feedstock across all three sites.",
  }).select().single());

  const batch2 = must("batch2", await db.from("production_batches").insert({
    project_id: projectId, code: "PB-2026-02", kiln_type: "flame_curtain_cone",
    feedstock_category: "ag_residue_no_value", temperature_profile: "500–600 °C, ~2 h residence",
    opened_at: "2026-06-20T06:00:00Z", status: "open",
    notes: "Second batch, in progress — accumulating runs and composite samples.",
  }).select().single());

  // --- Kiln runs ---
  function makeCurve(peak) {
    const pts = [];
    for (let t = 0; t <= 120; t += 15) {
      const frac = t <= 45 ? t / 45 : t <= 90 ? 1 : 1 - (t - 90) / 60;
      pts.push({ t, temp: round(120 + frac * (peak - 120), 0) });
    }
    return pts;
  }

  async function addRun({ batch, index, dateISO, status, operatorId }) {
    const kiln = pick(kilns);
    const wet = round(between(700, 1150), 1);
    const moisture = round(between(8, 16), 1);
    const peak = round(between(480, 620), 0);
    const startISO = dateISO;
    const start = new Date(dateISO);
    const end = new Date(start.getTime() + 3 * 3600 * 1000).toISOString();
    const composite = round(between(0.6, 1.2), 2);
    const reviewed = status === "approved";
    const run = must("run", await db.from("kiln_runs").insert({
      project_id: projectId, site_id: kiln.site_id, kiln_id: kiln.id,
      operator_id: operatorId, feedstock_batch_id: pick(deliveries).id,
      production_batch_id: batch.id, code: `${batch.code}-R${String(index).padStart(2, "0")}`,
      started_at: startISO, ended_at: end, peak_temp_c: peak,
      temperature_curve: makeCurve(peak),
      latitude: round(kiln.siteLat + between(-0.003, 0.003), 6),
      longitude: round(kiln.siteLng + between(-0.003, 0.003), 6),
      biochar_wet_kg: wet, biochar_moisture_pct: moisture, composite_sample_kg: composite,
      quench_method: "Water quench (rapid)", quenched_at: end,
      notes: rand() < 0.15 ? "Slightly higher smoke at ignition; corrected within 5 min." : null,
      anomaly_flag: rand() < 0.08,
      status,
      reviewed_by: reviewed ? uid.supervisor : null,
      reviewed_at: reviewed ? end : null,
      submitted_at: status === "draft" ? null : startISO,
      review_notes: status === "changes_requested" ? "Please re-upload the quench photo — it is blurred." : null,
    }).select().single());

    // photos (required evidence)
    const photoRows = [
      { photo_type: "pyrolysis", storage_path: "demo/pyrolysis.svg" },
      { photo_type: "flame_curtain", storage_path: "demo/flame_curtain.svg" },
      { photo_type: "quench", storage_path: "demo/quench.svg" },
    ].map((p) => ({
      kiln_run_id: run.id, ...p, taken_at: startISO,
      latitude: run.latitude, longitude: run.longitude,
    }));
    // for a changes_requested run, omit the quench photo to make the gap real
    const photos = status === "changes_requested" ? photoRows.slice(0, 2) : photoRows;
    must("photos", await db.from("run_photos").insert(photos));

    // composite sample contribution (site pile)
    must("composite", await db.from("composite_samples").insert({
      production_batch_id: batch.id, site_id: kiln.site_id, kiln_run_id: run.id,
      mass_kg: composite, stage: "site_pile", collected_at: end,
    }));
    return run;
  }

  // Batch 1 — 24 approved runs, Jan–Apr 2026
  let dryKgBatch1 = 0;
  for (let i = 1; i <= 24; i++) {
    const day = 10 + Math.floor((i / 24) * 90); // spread Jan–Apr
    const date = new Date(Date.UTC(2026, 0, 10 + Math.floor((i / 24) * 90), 7, 0, 0)).toISOString();
    const opId = i % 2 === 0 ? uid.operator2 : uid.operator;
    const run = await addRun({ batch: batch1, index: i, dateISO: date, status: "approved", operatorId: opId });
    dryKgBatch1 += run.biochar_dry_kg || 0;
  }

  // Batch 2 — mixed statuses, live review queue
  const batch2Statuses = ["approved", "approved", "submitted", "submitted", "changes_requested", "approved"];
  for (let i = 1; i <= batch2Statuses.length; i++) {
    const date = new Date(Date.UTC(2026, 5, 20 + i, 7, 0, 0)).toISOString();
    const opId = i % 2 === 0 ? uid.operator2 : uid.operator;
    await addRun({ batch: batch2, index: i, dateISO: date, status: batch2Statuses[i - 1], operatorId: opId });
  }

  // aggregate composite samples for batch 1 (site samples + batch representative sample)
  for (const s of sites) {
    must("site sample", await db.from("composite_samples").insert({
      production_batch_id: batch1.id, site_id: s.id, mass_kg: round(between(3, 5), 2),
      stage: "site_sample", collected_at: "2026-04-16T09:00:00Z",
    }));
  }
  must("batch sample", await db.from("composite_samples").insert({
    production_batch_id: batch1.id, mass_kg: 2.5, stage: "batch_sample",
    collected_at: "2026-04-18T09:00:00Z",
  }));

  // --- Lab test for batch 1 ---
  const organicCarbonPct = 80.4;
  const hcOrg = 0.42;
  const lab = must("lab", await db.from("lab_tests").insert({
    production_batch_id: batch1.id, lab_name: "Bhabha Accredited Carbon Lab, Pune",
    accreditation: "ISO/IEC 17025", sample_id: "PB-2026-01-REP",
    organic_carbon_pct: organicCarbonPct, hydrogen_carbon_molar_ratio: hcOrg,
    ash_content_pct: 11.8, moisture_pct: 3.1, ph: 9.2, inertinite_pct: 34.5,
    random_reflectance_pct: 1.9, pollutants_ok: true,
    stability_notes: "H/C_org 0.42 — well below the 0.7 durability threshold; high stability.",
    report_path: "demo/lab-report.pdf", tested_at: "2026-04-28", recorded_by: uid.developer,
  }).select().single());

  // --- GHG quantification for batch 1 (transparent breakdown) ---
  const dryT = round(dryKgBatch1 / 1000, 3);
  const soilTemp = 24.0; // > 22.5 → c=0.98, m=0.66
  const cCoef = 0.98, mCoef = 0.66;
  const fPerm = round(Math.max(0, Math.min(1, cCoef - mCoef * hcOrg)), 4);
  const cFrac = organicCarbonPct / 100;
  const gross = round(fPerm * cFrac * dryT * 3.6667, 3);
  const projectEmissions = 0.42;
  const transportEmissions = 0.61;
  const baseline = 0;
  const netBefore = round(gross - baseline - projectEmissions - transportEmissions, 3);
  const uncertaintyDiscount = 0.03;
  const net = round(Math.max(0, netBefore * (1 - uncertaintyDiscount)), 3);
  const breakdown = [
    { key: "dry_mass", label: "Dry biochar mass", value: dryT, detail: `${round(dryKgBatch1 / 1000, 3)} t (24 runs, moisture-corrected)` },
    { key: "permanence", label: "Permanence fraction", value: fPerm, detail: `F = ${cCoef} − ${mCoef} × ${hcOrg} (soil > 22.5 °C)` },
    { key: "gross_removal", label: "Gross biochar carbon removal", value: gross, detail: `${fPerm} × ${cFrac} C_org × ${dryT} t × 3.67` },
    { key: "baseline", label: "− Baseline removal", value: -baseline, detail: "No baseline storage claimed" },
    { key: "project_emissions", label: "− Project induced emissions", value: -projectEmissions, detail: "Biomass prep & handling" },
    { key: "transport", label: "− Transport emissions", value: -transportEmissions, detail: "Feedstock & biochar haulage (distance-based)" },
    { key: "net_before", label: "Net before uncertainty", value: netBefore, detail: "gross − baseline − project − transport" },
    { key: "uncertainty", label: "− Uncertainty discount (Low, 3%)", value: -round(netBefore * uncertaintyDiscount, 3), detail: "90–99% confidence" },
    { key: "net", label: "Net CO₂ removed", value: net, detail: "tCO₂e eligible for removal RCCs" },
  ];
  const ghg = must("ghg", await db.from("ghg_quantifications").insert({
    production_batch_id: batch1.id, lab_test_id: lab.id, credit_type: "removal",
    durability_years: 100, functional_unit: "1 tonne of biochar applied",
    biochar_fresh_t: round(dryT / (1 - 0.12), 3), moisture_fraction: 0.12,
    dry_t: dryT, organic_carbon_fraction: cFrac, hc_org_ratio: hcOrg, soil_temp_c: soilTemp,
    permanence_fraction: fPerm, gross_removal_tco2e: gross, baseline_removal_tco2e: baseline,
    project_emissions_tco2e: projectEmissions, transport_emissions_tco2e: transportEmissions,
    uncertainty_tier: "low", uncertainty_discount: uncertaintyDiscount,
    net_before_discount_tco2e: netBefore, net_co2_removed_tco2e: net,
    breakdown, computed_by: uid.developer,
  }).select().single());

  // --- End-use records (carbon locking) ---
  const endUses = [
    { qty: 4200, method: "Soil incorporation (broadcast + till)", recipient: "Baramati Farmer Group A", lat: 18.155, lng: 74.58 },
    { qty: 3800, method: "Compost co-application", recipient: "Indapur Organic Collective", lat: 18.12, lng: 75.03 },
    { qty: 5100, method: "Soil incorporation (banded)", recipient: "Phaltan Agro Hub demo plots", lat: 17.985, lng: 74.43 },
    { qty: 2600, method: "Soil incorporation (broadcast)", recipient: "Baramati Farmer Group B", lat: 18.149, lng: 74.571 },
  ];
  for (let i = 0; i < endUses.length; i++) {
    const e = endUses[i];
    must("enduse", await db.from("end_use_records").insert({
      project_id: projectId, production_batch_id: batch1.id, quantity_kg: e.qty,
      application_method: e.method, recipient_name: e.recipient,
      recipient_contact: `contact${i + 1}@farmers.demo`, latitude: e.lat, longitude: e.lng,
      applied_at: `2026-05-0${i + 1}T10:00:00Z`, proof_paths: ["demo/end_use.svg"],
      notes: "GPS-tagged application photos and delivery receipt on file.",
      recorded_by: uid.operator,
    }));
  }

  // batch 1 is now fully populated & sampled → mark verified (after runs are inserted)
  must("close batch1", await db.from("production_batches").update({ status: "verified" }).eq("id", batch1.id));

  // --- Verification (approved) ---
  const verification = must("verification", await db.from("verifications").insert({
    project_id: projectId, production_batch_id: batch1.id, verifier_id: uid.verifier,
    monitoring_period_start: "2026-01-01", monitoring_period_end: "2026-06-30",
    status: "approved", audit_type: "in_person",
    summary:
      "Evidence chain complete: all 24 kiln runs carry pyrolysis, flame-curtain and quench photos with GPS; composite sampling chain documented; H/C_org 0.42 confirms durability; end-use verified across four recipient groups. Net removal accepted.",
    report_path: "demo/verification-report.pdf", decided_at: "2026-06-25T12:00:00Z",
    created_by: uid.developer,
  }).select().single());
  must("finding1", await db.from("verification_findings").insert({
    verification_id: verification.id, category: "Sampling", severity: "low",
    description: "Two site-pile subsample masses were logged a day after the run. Developer provided corroborating photos.",
    related_entity: "composite_samples", status: "resolved", created_by: uid.verifier,
  }));
  must("finding2", await db.from("verification_findings").insert({
    verification_id: verification.id, category: "Transport", severity: "medium",
    description: "One haulage segment lacked a load factor; recomputed conservatively with default heavy-truck EF.",
    related_entity: "ghg_quantifications", status: "resolved", created_by: uid.verifier,
  }));

  // --- RCC issuance + credits ---
  const grossCredits = Math.floor(net);
  const bufferCredits = Math.ceil(grossCredits * 0.02);
  const netIssued = grossCredits - bufferCredits;
  const issuance = must("issuance", await db.from("rcc_issuances").insert({
    project_id: projectId, verification_id: verification.id, production_batch_id: batch1.id,
    ghg_quantification_id: ghg.id, credit_type: "removal", vintage: 2026, geography: "IN",
    gross_tco2e: grossCredits, buffer_tco2e: bufferCredits, net_issued_tco2e: netIssued,
    serial_prefix: "RCC-BIO-IN-P001-2026-RMV", status: "approved",
    initiated_by: uid.registry, approved_by: uid.admin,
  }).select().single());
  const issued = must("issue rpc", await db.rpc("fn_issue_credits", { p_issuance: issuance.id }));
  console.log(`→ issued ${issued} RCC credits (${bufferCredits} to buffer)`);

  // retire a few issued credits to a beneficiary
  const { data: toRetire } = await db.from("rcc_credits")
    .select("id").eq("issuance_id", issuance.id).eq("status", "issued").limit(6);
  for (const c of toRetire || []) {
    await db.rpc("fn_retire_credit", {
      p_credit: c.id, p_beneficiary: "EcoCorp Net-Zero Programme 2026", p_reason: "Voluntary corporate offset retirement",
    });
  }

  // --- Site audits (supervisor visits) ---
  for (const s of sites.slice(0, 2)) {
    must("site audit", await db.from("site_audits").insert({
      site_id: s.id, project_id: projectId, supervisor_id: uid.supervisor,
      visit_date: "2026-03-12", findings: "Kilns operated to SOP; PPE in use; feedstock storage dry. No non-conformities.",
      photos: ["demo/site.svg"],
    }));
  }

  // --- Notifications ---
  const notifs = [
    { user_id: uid.developer, type: "review_request", title: "2 runs awaiting review", body: "Batch PB-2026-02 has submissions pending sign-off.", link: "/runs?status=submitted" },
    { user_id: uid.supervisor, type: "review_request", title: "Changes requested acknowledged", body: "An operator re-uploaded a quench photo.", link: "/runs" },
    { user_id: uid.verifier, type: "verification_status", title: "Verification approved", body: "PB-2026-01 verification finalised.", link: "/verification" },
    { user_id: uid.developer, type: "issuance", title: "Credits issued", body: `${netIssued} removal RCCs issued for PB-2026-01.`, link: "/registry" },
    { user_id: uid.registry, type: "issuance", title: "Buffer contribution recorded", body: `${bufferCredits} credit(s) added to the buffer pool.`, link: "/registry/buffer" },
  ];
  must("notifs", await db.from("notifications").insert(notifs));

  console.log("\n✓ Seed complete.");
  console.log("──────────────────────────────────────────────");
  console.log("Demo sign-in (password for all): " + PASSWORD);
  for (const u of USERS) console.log(`  ${u.email.padEnd(24)} ${u.name} — ${u.global === "member" ? "project role" : u.global}`);
  console.log("──────────────────────────────────────────────");
  console.log(`Project: Deccan Biochar Cooperative (${PROJECT_CODE})`);
  console.log(`Batch PB-2026-01 → ${dryT} t dry biochar → ${net} tCO₂e net → ${netIssued} RCCs issued (+${bufferCredits} buffer)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
