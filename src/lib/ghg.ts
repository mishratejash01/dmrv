/**
 * GHG quantification engine — comparative LCA per ISO 14064-2:2019.
 *
 * Computes net CO₂ removed (tCO₂e) for a production batch, transparently:
 *   gross biochar removal  −  baseline removal  −  project & transport emissions
 *   then an uncertainty discount.
 *
 * Every intermediate value is returned so the UI can show the full chain
 * (never a black box), sourced from real batch / lab / transport records.
 */

import {
  BASELINE,
  CO2_PER_C,
  PERMANENCE_100_COEFFS,
  TRANSPORT_DISTANCE_EF,
  UNCERTAINTY_DISCOUNTS,
} from "./methodology";

export type DurabilityPathway = 100 | 1000;
export type UncertaintyTier = "low" | "medium" | "high" | "very_high";

export interface GhgInputs {
  /** Fresh (as-produced) biochar mass for the batch, tonnes. */
  biocharFreshTonnes: number;
  /** Moisture fraction (0–1) of the biochar (dry mass = fresh × (1 − moisture)). */
  moistureFraction: number;
  /** Organic carbon fraction (0–1) from the accredited lab (e.g. 0.82 = 82% C_org). */
  organicCarbonFraction: number;
  /** Molar H/C_org ratio from the lab (permanence indicator). */
  hcOrgRatio: number;
  /** Mean annual soil temperature at the end-use site, °C (selects regression coeffs). */
  soilTempC: number;
  /** Durability horizon claimed. */
  durabilityYears: DurabilityPathway;
  /** For the 1000-yr pathway: fraction of sample with random reflectance > 2% (0–1). */
  reflectanceFraction?: number;
  /** For the 1000-yr pathway: residual organic-carbon fraction (0–1). */
  residualCarbonFraction?: number;

  /** Project-induced emissions (tCO₂e) other than transport. */
  captureEmissions?: number;
  transformationEmissions?: number;
  /** Transport emissions (tCO₂e) — provide directly, or compute via transportSegments. */
  transportEmissions?: number;
  transportSegments?: TransportSegment[];

  /** Baseline: feedstock carbon that would have been stored anyway. */
  feedstockDryTonnes?: number;
  feedstockCarbonFraction?: number;
  applyBaselineDiscount?: boolean;

  uncertaintyTier?: UncertaintyTier;
}

export interface TransportSegment {
  label: string;
  mode: keyof typeof TRANSPORT_DISTANCE_EF;
  distanceKm: number;
  tonnes: number;
}

export interface GhgLine {
  key: string;
  label: string;
  value: number; // tCO₂e (positive = adds to removal, negative = subtracts)
  detail: string;
}

export interface GhgResult {
  dryTonnes: number;
  permanenceFraction: number;
  permanenceBasis: string;
  grossRemoval: number;
  baselineRemoval: number;
  projectEmissions: number;
  transportEmissions: number;
  netBeforeDiscount: number;
  uncertaintyDiscount: number;
  netCo2Removed: number;
  eligible: boolean;
  lines: GhgLine[];
  inputsEcho: GhgInputs;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const round = (n: number, dp = 3) => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

/** Select the temperature-dependent permanence regression coefficients. */
export function permanenceCoeffs(soilTempC: number) {
  return (
    PERMANENCE_100_COEFFS.find((row) => soilTempC <= row.maxSoilTempC) ??
    PERMANENCE_100_COEFFS[PERMANENCE_100_COEFFS.length - 1]
  );
}

/** 100-year permanence fraction: F_perm = c − m × (H/C_org), clamped to [0,1]. */
export function permanence100(hcOrg: number, soilTempC: number) {
  const { c, m } = permanenceCoeffs(soilTempC);
  return clamp01(c - m * hcOrg);
}

/** Distance-based transport emissions: E = Σ (distance × tonnes × EF). */
export function transportEmissionsFromSegments(segments: TransportSegment[]): number {
  return segments.reduce((sum, s) => {
    const ef = TRANSPORT_DISTANCE_EF[s.mode] ?? 0;
    return sum + (s.distanceKm * s.tonnes * ef) / 1000; // kg → t
  }, 0);
}

export function quantify(inputs: GhgInputs): GhgResult {
  const dryTonnes = round(inputs.biocharFreshTonnes * (1 - clamp01(inputs.moistureFraction)));

  // --- Permanence fraction ---
  let permanenceFraction: number;
  let permanenceBasis: string;
  if (inputs.durabilityYears === 1000) {
    const reflect = clamp01(inputs.reflectanceFraction ?? 0);
    const residual = clamp01(inputs.residualCarbonFraction ?? inputs.organicCarbonFraction);
    permanenceFraction = clamp01(reflect * residual);
    permanenceBasis = `1000-yr: reflectance fraction ${reflect} × residual C ${residual}`;
  } else {
    permanenceFraction = permanence100(inputs.hcOrgRatio, inputs.soilTempC);
    const { c, m, label } = permanenceCoeffs(inputs.soilTempC);
    permanenceBasis = `100-yr: F = ${c} − ${m} × ${round(inputs.hcOrgRatio, 3)} (soil ${label})`;
  }

  // --- Gross removal: F_perm × C_org × dry mass × 3.67 ---
  const grossRemoval = round(
    permanenceFraction * clamp01(inputs.organicCarbonFraction) * dryTonnes * CO2_PER_C,
  );

  // --- Baseline removal (carbon stored anyway): A_feed × C × 0.5% × 3.67 ---
  let baselineRemoval = 0;
  if (inputs.feedstockDryTonnes && inputs.feedstockCarbonFraction) {
    baselineRemoval =
      inputs.feedstockDryTonnes *
      clamp01(inputs.feedstockCarbonFraction) *
      BASELINE.feedstockCarbonStoredFraction *
      CO2_PER_C;
    if (inputs.applyBaselineDiscount) {
      baselineRemoval *= 1 - BASELINE.minDiscountFraction;
    }
    baselineRemoval = round(baselineRemoval);
  }

  // --- Project emissions ---
  const capture = inputs.captureEmissions ?? 0;
  const transformation = inputs.transformationEmissions ?? 0;
  const transport =
    inputs.transportEmissions ??
    (inputs.transportSegments ? transportEmissionsFromSegments(inputs.transportSegments) : 0);
  const projectEmissions = round(capture + transformation);
  const transportEmissions = round(transport);

  // --- Net before uncertainty ---
  const netBeforeDiscount = round(
    grossRemoval - baselineRemoval - projectEmissions - transportEmissions,
  );

  // --- Uncertainty discount ---
  const tier = inputs.uncertaintyTier ?? "low";
  const discountRow = UNCERTAINTY_DISCOUNTS.find((d) => d.key === tier) ?? UNCERTAINTY_DISCOUNTS[0];
  const uncertaintyDiscount = discountRow.discount;
  const netCo2Removed = round(Math.max(0, netBeforeDiscount * (1 - uncertaintyDiscount)));

  const eligible = inputs.hcOrgRatio < 0.7 && tier !== "very_high" && netCo2Removed > 0;

  const lines: GhgLine[] = [
    {
      key: "dry_mass",
      label: "Dry biochar mass",
      value: dryTonnes,
      detail: `${round(inputs.biocharFreshTonnes)} t fresh × (1 − ${round(inputs.moistureFraction, 3)} moisture)`,
    },
    {
      key: "permanence",
      label: "Permanence fraction",
      value: round(permanenceFraction, 3),
      detail: permanenceBasis,
    },
    {
      key: "gross_removal",
      label: "Gross biochar carbon removal",
      value: grossRemoval,
      detail: `F_perm ${round(permanenceFraction, 3)} × C_org ${round(inputs.organicCarbonFraction, 3)} × ${dryTonnes} t × ${CO2_PER_C} (CO₂/C)`,
    },
    {
      key: "baseline",
      label: "− Baseline removal (would occur anyway)",
      value: -baselineRemoval,
      detail: baselineRemoval
        ? `${inputs.feedstockDryTonnes} t feedstock × C × 0.5%${inputs.applyBaselineDiscount ? " (−3% discount)" : ""}`
        : "No baseline storage claimed",
    },
    {
      key: "project_emissions",
      label: "− Project induced emissions",
      value: -projectEmissions,
      detail: `Capture ${round(capture)} + processing ${round(transformation)} tCO₂e`,
    },
    {
      key: "transport",
      label: "− Transport emissions",
      value: -transportEmissions,
      detail: inputs.transportSegments
        ? `${inputs.transportSegments.length} segment(s), distance-based`
        : `${transportEmissions} tCO₂e`,
    },
    {
      key: "net_before",
      label: "Net before uncertainty",
      value: netBeforeDiscount,
      detail: "gross − baseline − project − transport",
    },
    {
      key: "uncertainty",
      label: `− Uncertainty discount (${discountRow.label})`,
      value: -round(netBeforeDiscount * uncertaintyDiscount),
      detail: `${Math.round(uncertaintyDiscount * 100)}% of net`,
    },
    {
      key: "net",
      label: "Net CO₂ removed",
      value: netCo2Removed,
      detail: "tCO₂e eligible for removal RCCs",
    },
  ];

  return {
    dryTonnes,
    permanenceFraction: round(permanenceFraction, 4),
    permanenceBasis,
    grossRemoval,
    baselineRemoval,
    projectEmissions,
    transportEmissions,
    netBeforeDiscount,
    uncertaintyDiscount,
    netCo2Removed,
    eligible,
    lines,
    inputsEcho: inputs,
  };
}
