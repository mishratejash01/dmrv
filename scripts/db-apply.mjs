// Apply SQL migrations (in order) to the Supabase project via the Management API.
// Usage:  node --env-file=.env.local scripts/db-apply.mjs [--only 0002]
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ref = process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!ref || !token) {
  console.error("Missing SUPABASE_PROJECT_REF / SUPABASE_ACCESS_TOKEN in env.");
  process.exit(1);
}

const only = process.argv.includes("--only")
  ? process.argv[process.argv.indexOf("--only") + 1]
  : null;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "supabase", "migrations");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .filter((f) => (only ? f.includes(only) : true))
  .sort();

async function runSql(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: sql }),
    },
  );
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

for (const f of files) {
  const sql = readFileSync(join(dir, f), "utf8");
  process.stdout.write(`→ applying ${f} … `);
  const { ok, status, text } = await runSql(sql);
  if (!ok) {
    console.error(`\n✗ FAILED (${status})\n${text}\n`);
    process.exit(1);
  }
  console.log("ok");
}
console.log("✓ All migrations applied.");
