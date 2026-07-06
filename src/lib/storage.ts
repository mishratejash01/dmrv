/** Build a public URL for a Supabase Storage object (or pass through absolute URLs). */
export function storageUrl(bucket: string, path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clean = path.replace(/^\/+/, "");
  return `${base}/storage/v1/object/public/${bucket}/${clean}`;
}

export const BUCKETS = {
  runPhotos: "run-photos",
  endUseProof: "end-use-proof",
  labReports: "lab-reports",
  verificationReports: "verification-reports",
  siteAuditPhotos: "site-audit-photos",
  avatars: "avatars",
} as const;
