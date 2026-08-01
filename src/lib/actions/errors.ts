import "server-only";

type ApiError = { code?: string | null; message?: string | null } | null | undefined;

const GENERIC = "That action could not be completed. Please try again.";

/**
 * Sanitise backend errors before they reach the browser. Our own guard
 * messages (plpgsql `raise exception`, SQLSTATE P0001) are written for end
 * users and pass through verbatim. Every other database-layer error is
 * replaced with a generic message — raw Postgres/PostgREST errors embed
 * table, constraint and policy names that callers have no business seeing.
 * Non-database errors (auth, storage) keep their already user-facing text.
 */
export function friendlyError(error: ApiError, fallback = GENERIC): string {
  if (!error?.message) return fallback;
  const code = error.code ?? "";
  if (code === "P0001") return error.message;
  if (/^[0-9A-Z]{5}$/.test(code)) return GENERIC;
  if (code.startsWith("PGRST")) return GENERIC;
  return error.message;
}
