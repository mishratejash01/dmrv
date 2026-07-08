// Live QA sweep: every route × every role → console errors, page errors,
// failed requests, HTTP status, dead links. Plus mobile viewport smoke.
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = "http://localhost:3000";
const PASS = "AcresDemo!26";

const admin = createClient(URL, SVC, { auth: { persistSession: false } });
const one = async (t, f, q) => {
  let x = admin.from(t).select(f).limit(1);
  for (const [k, v] of Object.entries(q || {})) x = x.eq(k, v);
  const { data } = await x.maybeSingle();
  return data;
};
const run = await one("kiln_runs", "id", { status: "approved" });
const batch = await one("production_batches", "id", { status: "verified" });
const openBatch = await one("production_batches", "id", { status: "open" });
const site = await one("sites", "id");
const ver = await one("verifications", "id");
const cred = await one("rcc_credits", "serial_number", { status: "retired" });
const feed = await one("feedstock_batches", "id");

async function cookiesFor(email) {
  const jar = {};
  const c = createServerClient(URL, ANON, {
    cookies: {
      getAll: () => Object.entries(jar).map(([name, value]) => ({ name, value })),
      setAll: (l) => l.forEach(({ name, value }) => (jar[name] = value)),
    },
  });
  const { error } = await c.auth.signInWithPassword({ email, password: PASS });
  if (error) throw new Error(email + ": " + error.message);
  return Object.entries(jar).map(([name, value]) => ({ name, value, url: BASE }));
}

const ROUTES_ALL = [
  "/dashboard", "/analytics", "/traceability",
  `/traceability?credit=${encodeURIComponent(cred.serial_number)}`,
  `/traceability?feedstock=${feed.id}`,
  "/runs", "/runs?status=submitted", `/runs/${run.id}`,
  "/batches", `/batches/${batch.id}`, `/batches/${openBatch.id}`,
  "/feedstock", "/sites", `/sites/${site.id}`,
  "/lab", "/ghg", "/end-use", "/verification", `/verification/${ver.id}`,
  "/registry", `/registry/${encodeURIComponent(cred.serial_number)}`, "/registry/buffer",
  "/team", "/settings", "/notifications",
];
const ROLES = {
  developer: ROUTES_ALL.concat(["/review", "/field"]),
  operator: ["/dashboard", "/field", "/runs", "/notifications", "/settings", "/batches", "/feedstock", "/traceability", "/analytics"],
  supervisor: ["/dashboard", "/review", "/runs", "/batches", "/sites", "/notifications"],
  verifier: ["/dashboard", "/verification", `/verification/${ver.id}`, "/runs", "/notifications"],
  registry: ["/dashboard", "/registry", `/registry/${encodeURIComponent(cred.serial_number)}`, "/registry/buffer", "/traceability", "/notifications"],
};
const PUBLIC = ["/", "/login", "/signup", "/registry-public"];

const browser = await chromium.launch({ channel: "chrome", headless: true });
const problems = [];
const IGNORE = [
  /Download the React DevTools/i,
  /third-party cookie/i,
  /favicon/i,
  /tile\.openstreetmap\.org/i, // map tiles can rate-limit in fast sweeps; not an app bug
];

async function sweep(label, cookies, routes, viewport = { width: 1440, height: 1200 }) {
  const ctx = await browser.newContext({ viewport });
  if (cookies) await ctx.addCookies(cookies);
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => {
    if (m.type() === "error" && !IGNORE.some((r) => r.test(m.text()))) errs.push({ kind: "console", text: m.text().slice(0, 220) });
  });
  page.on("pageerror", (e) => errs.push({ kind: "pageerror", text: String(e).slice(0, 220) }));
  page.on("requestfailed", (r) => {
    const u = r.url();
    if (!IGNORE.some((rx) => rx.test(u)) && u.startsWith(BASE)) errs.push({ kind: "reqfail", text: u.replace(BASE, "") + " → " + (r.failure()?.errorText || "") });
  });
  for (const route of routes) {
    errs.length = 0;
    let status = 0;
    try {
      const resp = await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 30000 });
      status = resp?.status() ?? 0;
      await page.waitForTimeout(1700);
      // catch Next error boundary / not-found rendering
      const body = await page.locator("body").innerText().catch(() => "");
      if (/Something went wrong/i.test(body) && /unexpected error/i.test(body)) errs.push({ kind: "boundary", text: "error boundary rendered" });
      if (/This page doesn.t exist/i.test(body)) errs.push({ kind: "404", text: "not-found rendered" });
      if (/Application error/i.test(body)) errs.push({ kind: "crash", text: "Next.js application error" });
    } catch (e) {
      errs.push({ kind: "nav", text: String(e).slice(0, 160) });
    }
    if (status >= 400 || errs.length) {
      problems.push({ who: label, route, status, errs: [...errs] });
      console.log(`  ✗ [${label}] ${route} (HTTP ${status}) ${errs.map((e) => e.kind + ": " + e.text).join(" | ")}`);
    } else {
      console.log(`  ✓ [${label}] ${route}`);
    }
  }
  await ctx.close();
}

console.log("== public ==");
await sweep("public", null, PUBLIC);
for (const [role, routes] of Object.entries(ROLES)) {
  console.log(`== ${role} ==`);
  await sweep(role, await cookiesFor(role + "@dmrv.demo"), routes);
}
console.log("== mobile operator (390x844) ==");
await sweep("mobile-op", await cookiesFor("operator@dmrv.demo"), ["/dashboard", "/field", "/runs"], { width: 390, height: 844 });

await browser.close();
console.log(`\n===== SWEEP DONE: ${problems.length} problem route-visits =====`);
for (const p of problems) console.log(JSON.stringify(p));
