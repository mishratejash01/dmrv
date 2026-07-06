// Regenerate TypeScript types from the live database schema.
// Usage:  node --env-file=.env.local scripts/db-types.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ref = process.env.SUPABASE_PROJECT_REF;
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!ref || !token) {
  console.error("Missing SUPABASE_PROJECT_REF / SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

const res = await fetch(
  `https://api.supabase.com/v1/projects/${ref}/types/typescript?included_schemas=public`,
  { headers: { Authorization: `Bearer ${token}` } },
);
if (!res.ok) {
  console.error("Failed to fetch types:", res.status, await res.text());
  process.exit(1);
}
const { types } = await res.json();
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "src", "lib", "types", "database.ts");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, types);
console.log(`✓ Wrote ${out}`);
