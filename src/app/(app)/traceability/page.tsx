import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  ArrowUpRight20Regular,
  Ribbon20Regular,
  BoxMultiple20Regular,
  Camera20Regular,
  Fire20Regular,
  Beaker20Regular,
  LeafOne20Regular,
  Organization20Regular,
  Scales20Regular,
  ShieldCheckmark20Regular,
  PlantGrass20Regular,
  Wallet20Regular,
} from "@/components/common/icons";
import { getAppContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, EmptyState, DataRow } from "@/components/ui/misc";
import { StatusBadge } from "@/components/status-badge";
import { PhotoGallery } from "@/components/evidence/photo-gallery";
import { cn, fmt, fmtCo2, fmtDate, humanize } from "@/lib/utils";
import { parseSerial } from "@/lib/rcc";
import { KILN_TYPES } from "@/lib/methodology";
import { BUCKETS } from "@/lib/storage";
import { TraceSelector } from "./trace-selector";

export const metadata: Metadata = { title: "Traceability" };

type StepTone = "clay" | "sage" | "ochre" | "info" | "neutral";

const TONE_RING: Record<StepTone, string> = {
  clay: "bg-clay-tint text-clay border-clay-soft",
  sage: "bg-sage-tint text-sage border-sage-soft",
  ochre: "bg-ochre-tint text-ochre border-ochre-soft",
  info: "bg-info-tint text-info border-border-strong",
  neutral: "bg-surface-2 text-ink-soft border-border-strong",
};

/** One node in the vertical provenance timeline. */
function Step({
  index,
  total,
  icon,
  eyebrow,
  title,
  tone = "clay",
  action,
  children,
}: {
  index: number;
  total: number;
  icon: ReactNode;
  eyebrow: string;
  title: ReactNode;
  tone?: StepTone;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className="relative pl-16 pb-8 last:pb-0">
      {index < total - 1 && (
        <span
          aria-hidden
          className="absolute left-[1.375rem] top-12 bottom-1 w-px bg-border"
        />
      )}
      <span
        className={cn(
          "absolute left-0 top-0 grid h-11 w-11 place-items-center rounded-full border [&_svg]:h-5 [&_svg]:w-5",
          TONE_RING[tone],
        )}
      >
        {icon}
      </span>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-xs uppercase tracking-wide text-muted">
          <span className="tnum">Step {index + 1}</span> · {eyebrow}
        </p>
        {action}
      </div>
      <h3 className="mt-0.5 font-display text-lg text-ink leading-tight">{title}</h3>
      <Card className="mt-3">
        <CardContent className="pt-5">{children}</CardContent>
      </Card>
    </li>
  );
}

function TraceLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm text-clay hover:underline flex items-center gap-1 shrink-0"
    >
      {children} <ArrowUpRight20Regular className="h-3.5 w-3.5" />
    </Link>
  );
}

export default async function TraceabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ credit?: string; feedstock?: string }>;
}) {
  const { credit: creditSerial, feedstock: feedstockId } = await searchParams;
  const ctx = await getAppContext();
  const project = ctx.activeProject!;
  const pid = project.id;
  const supabase = await createClient();

  const header = (
    <PageHeader
      title="Traceability"
      description="Follow the full chain of custody in either direction — from an issued carbon credit back to the feedstock it came from, or from a delivery forward to the credits it produced."
    />
  );

  // ======================================================================
  // CREDIT → back through the whole provenance chain
  // ======================================================================
  if (creditSerial) {
    const { data: credit } = await supabase
      .from("rcc_credits")
      .select("*")
      .eq("serial_number", creditSerial)
      .maybeSingle();

    if (!credit || credit.project_id !== pid) {
      return (
        <div>
          {header}
          <EmptyState
            icon={<Organization20Regular />}
            title="Credit not found"
            description={`No credit with serial ${creditSerial} exists in this project.`}
            action={<TraceLink href="/traceability">Back to traceability</TraceLink>}
          />
        </div>
      );
    }

    const { data: issuance } = await supabase
      .from("rcc_issuances")
      .select("*")
      .eq("id", credit.issuance_id)
      .maybeSingle();

    const batchId = issuance?.production_batch_id ?? null;
    const { data: batch } = batchId
      ? await supabase.from("production_batches").select("*").eq("id", batchId).maybeSingle()
      : { data: null };

    const [labRes, ghgRes, runsRes, endUseRes, verifRes, creditCountRes] = await Promise.all([
      batchId
        ? supabase
            .from("lab_tests")
            .select("*")
            .eq("production_batch_id", batchId)
            .order("created_at", { ascending: false })
            .limit(1)
        : Promise.resolve({ data: [] as never[] }),
      batchId
        ? supabase
            .from("ghg_quantifications")
            .select("*")
            .eq("production_batch_id", batchId)
            .order("computed_at", { ascending: false })
            .limit(1)
        : Promise.resolve({ data: [] as never[] }),
      batchId
        ? supabase
            .from("kiln_runs")
            .select(
              "id, code, status, started_at, biochar_dry_kg, feedstock_batch_id, sites(name), kilns(code)",
            )
            .eq("production_batch_id", batchId)
            .order("started_at", { ascending: true })
        : Promise.resolve({ data: [] as never[] }),
      batchId
        ? supabase
            .from("end_use_records")
            .select("*")
            .eq("production_batch_id", batchId)
            .order("applied_at", { ascending: false })
        : Promise.resolve({ data: [] as never[] }),
      issuance?.verification_id
        ? supabase
            .from("verifications")
            .select("id, status, audit_type, decided_at, created_at")
            .eq("id", issuance.verification_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("rcc_credits")
        .select("id", { count: "exact", head: true })
        .eq("issuance_id", credit.issuance_id),
    ]);

    const lab = (labRes.data as Record<string, unknown>[] | null)?.[0] ?? null;
    const ghg = (ghgRes.data as Record<string, unknown>[] | null)?.[0] ?? null;
    const runs = (runsRes.data ?? []) as {
      id: string;
      code: string | null;
      status: string;
      started_at: string | null;
      biochar_dry_kg: number | null;
      feedstock_batch_id: string | null;
      sites: { name: string } | null;
      kilns: { code: string } | null;
    }[];
    const endUses = (endUseRes.data ?? []) as Record<string, unknown>[];
    const verification = verifRes.data as {
      id: string;
      status: string;
      audit_type: string;
      decided_at: string | null;
    } | null;
    const creditsInIssuance = creditCountRes.count ?? 0;

    // Feedstock deliveries feeding those runs
    const fsIds = Array.from(
      new Set(runs.map((r) => r.feedstock_batch_id).filter((x): x is string => !!x)),
    );
    const runIds = runs.map((r) => r.id);
    const [fsRes, photoRes] = await Promise.all([
      fsIds.length
        ? supabase
            .from("feedstock_batches")
            .select("id, source, category, weight_kg, dry_weight_kg, received_at")
            .in("id", fsIds)
        : Promise.resolve({ data: [] as never[] }),
      runIds.length
        ? supabase
            .from("run_photos")
            .select("photo_type, storage_path, latitude, longitude, taken_at, kiln_run_id")
            .in("kiln_run_id", runIds)
        : Promise.resolve({ data: [] as never[] }),
    ]);
    const feedstocks = (fsRes.data ?? []) as {
      id: string;
      source: string;
      category: string;
      weight_kg: number;
      dry_weight_kg: number;
      received_at: string;
    }[];
    const photos = (photoRes.data ?? []) as {
      photo_type: string;
      storage_path: string;
      latitude: number | null;
      longitude: number | null;
      taken_at: string | null;
    }[];

    const parsed = parseSerial(credit.serial_number);
    const kilnLabel = batch
      ? KILN_TYPES.find((k) => k.key === batch.kiln_type)?.label ?? humanize(batch.kiln_type)
      : "—";

    // Build the ordered chain of steps that actually exist.
    const steps: {
      icon: ReactNode;
      eyebrow: string;
      title: ReactNode;
      tone: StepTone;
      action?: ReactNode;
      body: ReactNode;
    }[] = [];

    steps.push({
      icon: <Ribbon20Regular />,
      eyebrow: "Carbon credit",
      title: <span className="tnum">{credit.serial_number}</span>,
      tone: "clay",
      action: <TraceLink href="/registry">Registry</TraceLink>,
      body: (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <StatusBadge kind="credit" value={credit.status} />
            <Badge tone="neutral">{humanize(credit.credit_type)}</Badge>
            <Badge tone="info">Vintage {credit.vintage}</Badge>
            <Badge tone="neutral">{credit.geography}</Badge>
          </div>
          <dl>
            <DataRow label="Serial">
              <span className="tnum">{credit.serial_number}</span>
            </DataRow>
            {parsed.valid && (
              <DataRow label="Mechanism">{parsed.mechanismLabel}</DataRow>
            )}
            <DataRow label="Current holder">{credit.current_holder ?? "—"}</DataRow>
            {credit.retired_at && (
              <DataRow label="Retired">
                {fmtDate(credit.retired_at)}
                {credit.retired_reason ? ` · ${credit.retired_reason}` : ""}
              </DataRow>
            )}
            <DataRow label="Issued">{fmtDate(credit.created_at)}</DataRow>
          </dl>
        </>
      ),
    });

    if (issuance) {
      steps.push({
        icon: <Wallet20Regular />,
        eyebrow: "Issuance",
        title: `${fmt(Number(issuance.net_issued_tco2e), 0)} credits issued`,
        tone: "ochre",
        action: <TraceLink href="/registry">Registry</TraceLink>,
        body: (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <StatusBadge kind="issuance" value={issuance.status} />
              {issuance.serial_prefix && (
                <Badge tone="neutral">
                  <span className="tnum">{issuance.serial_prefix}</span>
                </Badge>
              )}
            </div>
            <dl>
              <DataRow label="Gross">
                <span className="tnum">{fmtCo2(Number(issuance.gross_tco2e), 0)}</span>
              </DataRow>
              <DataRow label="Buffer withheld">
                <span className="tnum">{fmtCo2(Number(issuance.buffer_tco2e), 0)}</span>
              </DataRow>
              <DataRow label="Net issued">
                <span className="tnum">{fmtCo2(Number(issuance.net_issued_tco2e), 0)}</span>
              </DataRow>
              <DataRow label="This serial is 1 of">
                <span className="tnum">{creditsInIssuance}</span> credits
              </DataRow>
              <DataRow label="Issued">{fmtDate(issuance.issued_at)}</DataRow>
            </dl>
          </>
        ),
      });
    }

    if (verification) {
      steps.push({
        icon: <ShieldCheckmark20Regular />,
        eyebrow: "Verification",
        title: `${humanize(verification.audit_type)} audit`,
        tone: "sage",
        action: <TraceLink href={`/verification/${verification.id}`}>Open audit</TraceLink>,
        body: (
          <dl>
            <DataRow label="Status">
              <StatusBadge kind="verification" value={verification.status} />
            </DataRow>
            <DataRow label="Decided">{fmtDate(verification.decided_at)}</DataRow>
          </dl>
        ),
      });
    }

    if (ghg) {
      steps.push({
        icon: <Scales20Regular />,
        eyebrow: "GHG quantification",
        title: (
          <span className="tnum">{fmtCo2(Number(ghg.net_co2_removed_tco2e))} net removed</span>
        ),
        tone: "sage",
        action: <TraceLink href="/ghg">GHG</TraceLink>,
        body: (
          <dl>
            <DataRow label="Gross removal">
              <span className="tnum">{fmtCo2(Number(ghg.gross_removal_tco2e))}</span>
            </DataRow>
            <DataRow label="Permanence">
              <span className="tnum">{fmt(Number(ghg.permanence_fraction), 3)}</span>
            </DataRow>
            <DataRow label="Durability">{`${String(ghg.durability_years)}-yr`}</DataRow>
            <DataRow label="Computed">{fmtDate(ghg.computed_at as string)}</DataRow>
          </dl>
        ),
      });
    }

    if (lab) {
      steps.push({
        icon: <Beaker20Regular />,
        eyebrow: "Lab test",
        title: String(lab.lab_name),
        tone: "info",
        action: <TraceLink href="/lab">Lab</TraceLink>,
        body: (
          <dl>
            <DataRow label="H/C_org ratio">
              <span className="tnum">{fmt(Number(lab.hydrogen_carbon_molar_ratio), 3)}</span>
            </DataRow>
            <DataRow label="Organic carbon">
              <span className="tnum">{fmt(Number(lab.organic_carbon_pct), 1)}%</span>
            </DataRow>
            <DataRow label="Accreditation">{(lab.accreditation as string) ?? "—"}</DataRow>
            <DataRow label="Tested">{fmtDate(lab.tested_at as string)}</DataRow>
          </dl>
        ),
      });
    }

    if (batch) {
      steps.push({
        icon: <BoxMultiple20Regular />,
        eyebrow: "Production batch",
        title: batch.code,
        tone: "clay",
        action: <TraceLink href={`/batches/${batch.id}`}>Open batch</TraceLink>,
        body: (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <StatusBadge kind="batch" value={batch.status} />
              <Badge tone="neutral">{kilnLabel}</Badge>
            </div>
            <dl>
              <DataRow label="Dry biochar">
                <span className="tnum">
                  {fmt(Number(batch.total_biochar_dry_kg) / 1000, 2)} t
                </span>
              </DataRow>
              <DataRow label="Runs">
                <span className="tnum">{batch.run_count}</span>
              </DataRow>
              <DataRow label="Opened">{fmtDate(batch.opened_at)}</DataRow>
              <DataRow label="Closed">{batch.closed_at ? fmtDate(batch.closed_at) : "—"}</DataRow>
            </dl>
          </>
        ),
      });
    }

    steps.push({
      icon: <Fire20Regular />,
      eyebrow: "Kiln runs",
      title: `${runs.length} run${runs.length === 1 ? "" : "s"} in this batch`,
      tone: "clay",
      action: <TraceLink href="/runs">All runs</TraceLink>,
      body:
        runs.length === 0 ? (
          <p className="text-sm text-muted">No runs assigned to this batch.</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
            {runs.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 bg-surface/40 px-3 py-2 text-sm"
              >
                <Link
                  href={`/runs/${r.id}`}
                  className="font-medium text-ink hover:text-clay min-w-0 truncate"
                >
                  {r.code ?? r.id.slice(0, 8)}
                </Link>
                <span className="flex items-center gap-3 shrink-0">
                  <span className="text-muted text-xs">
                    {r.sites?.name ?? "—"} · {r.kilns?.code ?? "—"}
                  </span>
                  <span className="tnum text-ink">
                    {r.biochar_dry_kg ? `${fmt(Number(r.biochar_dry_kg), 0)} kg` : "—"}
                  </span>
                  <StatusBadge kind="run" value={r.status} />
                </span>
              </div>
            ))}
          </div>
        ),
    });

    steps.push({
      icon: <PlantGrass20Regular />,
      eyebrow: "Feedstock deliveries",
      title: `${feedstocks.length} deliver${feedstocks.length === 1 ? "y" : "ies"} at the root`,
      tone: "sage",
      action: <TraceLink href="/feedstock">Feedstock</TraceLink>,
      body:
        feedstocks.length === 0 ? (
          <p className="text-sm text-muted">
            No feedstock deliveries are linked to the runs in this batch.
          </p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
            {feedstocks.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between gap-3 bg-surface/40 px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  <span className="font-medium text-ink">{f.source}</span>
                  <span className="text-muted"> · {humanize(f.category)}</span>
                </span>
                <span className="flex items-center gap-3 shrink-0">
                  <span className="text-muted text-xs">{fmtDate(f.received_at)}</span>
                  <span className="tnum text-ink">{fmt(Number(f.dry_weight_kg), 0)} kg dry</span>
                </span>
              </div>
            ))}
          </div>
        ),
    });

    if (photos.length > 0) {
      steps.push({
        icon: <Camera20Regular />,
        eyebrow: "Field evidence",
        title: `${photos.length} run photo${photos.length === 1 ? "" : "s"}`,
        tone: "ochre",
        body: <PhotoGallery photos={photos} bucket={BUCKETS.runPhotos} columns={3} />,
      });
    }

    if (endUses.length > 0) {
      steps.push({
        icon: <LeafOne20Regular />,
        eyebrow: "Carbon locking",
        title: `${endUses.length} end-use record${endUses.length === 1 ? "" : "s"}`,
        tone: "sage",
        action: <TraceLink href="/end-use">End-use</TraceLink>,
        body: (
          <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
            {endUses.map((e) => (
              <div
                key={String(e.id)}
                className="flex items-center justify-between gap-3 bg-surface/40 px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  <span className="font-medium text-ink">{humanize(String(e.application_method))}</span>
                  {e.recipient_name ? (
                    <span className="text-muted"> · {String(e.recipient_name)}</span>
                  ) : null}
                </span>
                <span className="flex items-center gap-3 shrink-0">
                  <span className="text-muted text-xs">{fmtDate(e.applied_at as string)}</span>
                  <span className="tnum text-ink">{fmt(Number(e.quantity_kg), 0)} kg</span>
                </span>
              </div>
            ))}
          </div>
        ),
      });
    }

    return (
      <div>
        {header}
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <TraceLink href="/traceability">Trace something else</TraceLink>
        </div>
        <ol className="relative">
          {steps.map((s, i) => (
            <Step
              key={i}
              index={i}
              total={steps.length}
              icon={s.icon}
              eyebrow={s.eyebrow}
              title={s.title}
              tone={s.tone}
              action={s.action}
            >
              {s.body}
            </Step>
          ))}
        </ol>
      </div>
    );
  }

  // ======================================================================
  // FEEDSTOCK → forward to the credits it produced
  // ======================================================================
  if (feedstockId) {
    const { data: feedstock } = await supabase
      .from("feedstock_batches")
      .select("*")
      .eq("id", feedstockId)
      .maybeSingle();

    if (!feedstock || feedstock.project_id !== pid) {
      return (
        <div>
          {header}
          <EmptyState
            icon={<Organization20Regular />}
            title="Delivery not found"
            description="No feedstock delivery with that id exists in this project."
            action={<TraceLink href="/traceability">Back to traceability</TraceLink>}
          />
        </div>
      );
    }

    const { data: runsData } = await supabase
      .from("kiln_runs")
      .select(
        "id, code, status, started_at, biochar_dry_kg, production_batch_id, sites(name), kilns(code)",
      )
      .eq("feedstock_batch_id", feedstockId)
      .order("started_at", { ascending: true });
    const runs = (runsData ?? []) as {
      id: string;
      code: string | null;
      status: string;
      started_at: string | null;
      biochar_dry_kg: number | null;
      production_batch_id: string | null;
      sites: { name: string } | null;
      kilns: { code: string } | null;
    }[];

    const batchIds = Array.from(
      new Set(runs.map((r) => r.production_batch_id).filter((x): x is string => !!x)),
    );

    const [batchesRes, issuancesRes] = await Promise.all([
      batchIds.length
        ? supabase
            .from("production_batches")
            .select("id, code, status, total_biochar_dry_kg, opened_at")
            .in("id", batchIds)
        : Promise.resolve({ data: [] as never[] }),
      batchIds.length
        ? supabase
            .from("rcc_issuances")
            .select("id, production_batch_id, status, net_issued_tco2e, issued_at, serial_prefix")
            .in("production_batch_id", batchIds)
        : Promise.resolve({ data: [] as never[] }),
    ]);
    const batches = (batchesRes.data ?? []) as {
      id: string;
      code: string;
      status: string;
      total_biochar_dry_kg: number;
      opened_at: string;
    }[];
    const issuances = (issuancesRes.data ?? []) as {
      id: string;
      production_batch_id: string | null;
      status: string;
      net_issued_tco2e: number;
      issued_at: string | null;
      serial_prefix: string | null;
    }[];

    const issuanceIds = issuances.map((i) => i.id);
    const { data: creditsData } = issuanceIds.length
      ? await supabase
          .from("rcc_credits")
          .select("serial_number, status, vintage, issuance_id")
          .in("issuance_id", issuanceIds)
          .order("serial_number", { ascending: true })
      : { data: [] as never[] };
    const credits = (creditsData ?? []) as {
      serial_number: string;
      status: string;
      vintage: number;
      issuance_id: string;
    }[];

    const steps: {
      icon: ReactNode;
      eyebrow: string;
      title: ReactNode;
      tone: StepTone;
      action?: ReactNode;
      body: ReactNode;
    }[] = [];

    steps.push({
      icon: <PlantGrass20Regular />,
      eyebrow: "Feedstock delivery",
      title: feedstock.source,
      tone: "sage",
      action: <TraceLink href="/feedstock">Feedstock</TraceLink>,
      body: (
        <dl>
          <DataRow label="Category">{humanize(feedstock.category)}</DataRow>
          <DataRow label="Delivered">
            <span className="tnum">{fmt(Number(feedstock.weight_kg), 0)} kg wet</span>
          </DataRow>
          <DataRow label="Dry matter">
            <span className="tnum">{fmt(Number(feedstock.dry_weight_kg), 0)} kg</span>
          </DataRow>
          <DataRow label="Moisture">
            <span className="tnum">{fmt(Number(feedstock.moisture_pct), 1)}%</span>
          </DataRow>
          <DataRow label="Received">{fmtDate(feedstock.received_at)}</DataRow>
          {feedstock.source_area_description && (
            <DataRow label="Source area">{feedstock.source_area_description}</DataRow>
          )}
        </dl>
      ),
    });

    steps.push({
      icon: <Fire20Regular />,
      eyebrow: "Kiln runs",
      title: `Charred in ${runs.length} run${runs.length === 1 ? "" : "s"}`,
      tone: "clay",
      action: <TraceLink href="/runs">All runs</TraceLink>,
      body:
        runs.length === 0 ? (
          <p className="text-sm text-muted">This delivery has not yet been used in a kiln run.</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
            {runs.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 bg-surface/40 px-3 py-2 text-sm"
              >
                <Link
                  href={`/runs/${r.id}`}
                  className="font-medium text-ink hover:text-clay min-w-0 truncate"
                >
                  {r.code ?? r.id.slice(0, 8)}
                </Link>
                <span className="flex items-center gap-3 shrink-0">
                  <span className="text-muted text-xs">
                    {r.sites?.name ?? "—"} · {r.kilns?.code ?? "—"}
                  </span>
                  <span className="tnum text-ink">
                    {r.biochar_dry_kg ? `${fmt(Number(r.biochar_dry_kg), 0)} kg` : "—"}
                  </span>
                  <StatusBadge kind="run" value={r.status} />
                </span>
              </div>
            ))}
          </div>
        ),
    });

    steps.push({
      icon: <BoxMultiple20Regular />,
      eyebrow: "Production batches",
      title: `Grouped into ${batches.length} batch${batches.length === 1 ? "" : "es"}`,
      tone: "ochre",
      action: <TraceLink href="/batches">Batches</TraceLink>,
      body:
        batches.length === 0 ? (
          <p className="text-sm text-muted">These runs are not yet assigned to a batch.</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
            {batches.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-3 bg-surface/40 px-3 py-2 text-sm"
              >
                <Link
                  href={`/batches/${b.id}`}
                  className="font-medium text-ink hover:text-clay min-w-0 truncate"
                >
                  {b.code}
                </Link>
                <span className="flex items-center gap-3 shrink-0">
                  <span className="tnum text-ink">
                    {fmt(Number(b.total_biochar_dry_kg) / 1000, 2)} t
                  </span>
                  <StatusBadge kind="batch" value={b.status} />
                </span>
              </div>
            ))}
          </div>
        ),
    });

    steps.push({
      icon: <Ribbon20Regular />,
      eyebrow: "Carbon credits",
      title:
        issuances.length === 0
          ? "No credits issued yet"
          : `${credits.length} credit${credits.length === 1 ? "" : "s"} issued`,
      tone: "clay",
      action: <TraceLink href="/registry">Registry</TraceLink>,
      body:
        issuances.length === 0 ? (
          <p className="text-sm text-muted">
            These batches have not been issued into carbon credits yet.
          </p>
        ) : (
          <div className="space-y-4">
            {issuances.map((iss) => {
              const isCredits = credits.filter((c) => c.issuance_id === iss.id);
              return (
                <div key={iss.id}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-sm text-ink-soft">
                      {iss.serial_prefix ? (
                        <span className="tnum">{iss.serial_prefix}</span>
                      ) : (
                        "Issuance"
                      )}
                      <span className="text-muted">
                        {" "}
                        · {fmt(Number(iss.net_issued_tco2e), 0)} net
                      </span>
                    </span>
                    <StatusBadge kind="issuance" value={iss.status} />
                  </div>
                  {isCredits.length === 0 ? (
                    <p className="text-xs text-muted">Credit units not yet minted.</p>
                  ) : (
                    <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
                      {isCredits.map((c) => (
                        <Link
                          key={c.serial_number}
                          href={`/traceability?credit=${encodeURIComponent(c.serial_number)}`}
                          className="flex items-center justify-between gap-3 bg-surface/40 px-3 py-2 text-sm hover:bg-surface"
                        >
                          <span className="font-medium text-ink tnum min-w-0 truncate">
                            {c.serial_number}
                          </span>
                          <StatusBadge kind="credit" value={c.status} />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ),
    });

    return (
      <div>
        {header}
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <TraceLink href="/traceability">Trace something else</TraceLink>
        </div>
        <ol className="relative">
          {steps.map((s, i) => (
            <Step
              key={i}
              index={i}
              total={steps.length}
              icon={s.icon}
              eyebrow={s.eyebrow}
              title={s.title}
              tone={s.tone}
              action={s.action}
            >
              {s.body}
            </Step>
          ))}
        </ol>
      </div>
    );
  }

  // ======================================================================
  // DEFAULT → explanation + selector
  // ======================================================================
  const [recentCreditsRes, recentFeedstockRes] = await Promise.all([
    supabase
      .from("rcc_credits")
      .select("serial_number, status, vintage")
      .eq("project_id", pid)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("feedstock_batches")
      .select("id, source, category, received_at")
      .eq("project_id", pid)
      .order("received_at", { ascending: false })
      .limit(40),
  ]);

  const creditOptions = (recentCreditsRes.data ?? []).map((c) => ({
    serial: c.serial_number,
    label: `${c.serial_number} · ${humanize(c.status)}`,
  }));
  const feedstockOptions = (recentFeedstockRes.data ?? []).map((f) => ({
    id: f.id,
    label: `${f.source} · ${humanize(f.category)} · ${fmtDate(f.received_at)}`,
  }));

  const CHAIN = [
    { icon: <PlantGrass20Regular />, label: "Feedstock delivery" },
    { icon: <Fire20Regular />, label: "Kiln run" },
    { icon: <BoxMultiple20Regular />, label: "Production batch" },
    { icon: <Beaker20Regular />, label: "Lab test" },
    { icon: <Scales20Regular />, label: "GHG quantification" },
    { icon: <ShieldCheckmark20Regular />, label: "Verification" },
    { icon: <Ribbon20Regular />, label: "Carbon credit" },
  ];

  return (
    <div>
      {header}

      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Organization20Regular className="h-4 w-4 text-clay" />
            <h2 className="font-display text-lg text-ink">The full chain of custody</h2>
          </div>
          <p className="text-sm text-muted max-w-2xl text-pretty mb-5">
            Every carbon credit is traceable end to end. Pick a credit to walk the chain{" "}
            <span className="text-ink">backward</span> to the biomass it came from, or a delivery to
            follow it <span className="text-ink">forward</span> to the credits it produced.
          </p>
          <div className="flex flex-wrap items-center gap-x-1 gap-y-3">
            {CHAIN.map((c, i) => (
              <div key={c.label} className="flex items-center gap-1">
                <span className="inline-flex items-center gap-1.5 rounded border border-border bg-surface/60 px-2.5 py-1.5 text-xs text-ink-soft [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:text-clay">
                  {c.icon}
                  {c.label}
                </span>
                {i < CHAIN.length - 1 && (
                  <ArrowUpRight20Regular className="h-3.5 w-3.5 rotate-45 text-faint" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <TraceSelector credits={creditOptions} feedstock={feedstockOptions} />
          {creditOptions.length === 0 && feedstockOptions.length === 0 && (
            <p className="mt-4 text-sm text-muted">
              Nothing to trace yet — record a feedstock delivery or issue credits to build the chain.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
