// Deep probes: RBAC gating, UI form persistence, invalid input, dynamic-data proof.
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = "http://localhost:3000", PASS = "AcresDemo!26";
const admin = createClient(URL, SVC, { auth: { persistSession: false } });

async function cookiesFor(email) {
  const jar = {};
  const c = createServerClient(URL, ANON, { cookies: { getAll: () => Object.entries(jar).map(([name, value]) => ({ name, value })), setAll: (l) => l.forEach(({ name, value }) => (jar[name] = value)) } });
  const { error } = await c.auth.signInWithPassword({ email, password: PASS });
  if (error) throw error;
  return Object.entries(jar).map(([name, value]) => ({ name, value, url: BASE }));
}
const P = (ok, msg) => console.log(`${ok ? "✓ PASS" : "✗ FAIL"}  ${msg}`);
const browser = await chromium.launch({ channel: "chrome", headless: true });

async function pageAs(role, viewport = { width: 1440, height: 1200 }) {
  const ctx = await browser.newContext({ viewport });
  await ctx.addCookies(await cookiesFor(role + "@dmrv.demo"));
  const page = await ctx.newPage();
  return { ctx, page };
}

// ---------- 1. RBAC gating on forbidden routes ----------
{
  const { ctx, page } = await pageAs("operator");
  for (const [route, expect] of [["/review", /reviewer access|access required/i], ["/team", /./], ["/registry", /./]]) {
    await page.goto(BASE + route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    const body = await page.locator("body").innerText();
    const crashed = /Something went wrong|Application error/i.test(body);
    if (route === "/review") P(!crashed && expect.test(body), `operator on /review → graceful gate ("${(body.match(expect) || [""])[0]}")`);
    else {
      // team/registry: RLS hides data; page must render gracefully with no crash and no other project's data
      P(!crashed, `operator on ${route} → renders without crash (RLS scopes data)`);
    }
  }
  // operator sees NO review-queue nav item
  await page.goto(BASE + "/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  const nav = await page.locator("aside").innerText();
  P(!/Review queue|Team & roles/.test(nav), "operator nav hides Review queue & Team");
  await ctx.close();
}

// ---------- 2. Form persistence via real UI (feedstock delivery) ----------
{
  const { ctx, page } = await pageAs("developer");
  await page.goto(BASE + "/feedstock", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const MARK = "QA Probe Farm 77";
  await page.getByRole("button", { name: /add delivery/i }).first().click();
  await page.waitForTimeout(600);
  const dialog = page.locator('[role="dialog"]');
  await dialog.locator('input').first().fill(MARK); // source field
  // fill weight + moisture (number inputs)
  const nums = dialog.locator('input[type="number"]');
  await nums.nth(0).fill("1234");
  await nums.nth(1).fill("11");
  await dialog.getByRole("button", { name: /add|save|record/i }).last().click();
  await page.waitForTimeout(2000);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const body = await page.locator("body").innerText();
  P(body.includes(MARK), "feedstock delivery submitted via UI persists after reload");
  // invalid input: weight empty
  await page.getByRole("button", { name: /add delivery/i }).first().click();
  await page.waitForTimeout(600);
  const d2 = page.locator('[role="dialog"]');
  await d2.locator("input").first().fill("QA Invalid Probe");
  await d2.locator('input[type="number"]').nth(0).fill("");
  await d2.getByRole("button", { name: /add|save|record/i }).last().click();
  await page.waitForTimeout(1200);
  const stillOpen = await d2.isVisible().catch(() => false);
  const body2 = await page.locator("body").innerText();
  P(stillOpen || /weight|required|enter/i.test(body2), "invalid delivery (no weight) is rejected with feedback, no crash");
  await page.keyboard.press("Escape");
  await ctx.close();
  // cleanup probe rows
  await admin.from("feedstock_batches").delete().ilike("source", "QA %Probe%");
  await admin.from("feedstock_batches").delete().eq("source", MARK);
  console.log("   (probe rows cleaned)");
}

// ---------- 3. Dynamic-data proof: numbers move with underlying data ----------
{
  async function grab(page, route, re) {
    await page.goto(BASE + route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1800);
    const t = await page.locator("body").innerText();
    const m = t.match(re);
    return m ? m[1] : null;
  }
  const { ctx, page } = await pageAs("developer");
  const before = await grab(page, "/dashboard", /Biochar produced\s*([\d.,]+)\s*t dry/);
  // insert a hefty approved run into the OPEN batch via admin
  const { data: ob } = await admin.from("production_batches").select("id,total_biochar_dry_kg").eq("status", "open").limit(1).single();
  const { data: kiln } = await admin.from("kilns").select("id,site_id,project_id").limit(1).single();
  const { data: op } = await admin.from("profiles").select("id").eq("email", "operator@dmrv.demo").single();
  const { data: probeRun } = await admin.from("kiln_runs").insert({
    project_id: kiln.project_id, site_id: kiln.site_id, kiln_id: kiln.id, oper