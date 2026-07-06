/**
 * Rainbow Standard — Distributed Open-Kiln Biochar methodology constants.
 *
 * Encodes the actual rules, thresholds, formulas, and factors from:
 *   - Distributed open-kiln biochar (RBW-BCR-DOB-V1.0, 2026-04-24)
 *   - BiCRS parent methodology (RBW-BICRS-GEN-V1.1)
 *   - Biochar-application-to-soils storage module
 *   - Transport (RBW-MOD-TPRT-V1.4) & Processing-and-energy modules
 *   - Rainbow Standard Rules (GHG quantification, RCCs, registry)
 *
 * These values are used across the app so the domain logic stays faithful and
 * every calculation is transparent and traceable back to the standard.
 */

export const METHODOLOGY = {
  id: "RBW-BCR-DOB-V1.0",
  name: "Distributed open-kiln biochar",
  version: "1.0",
  releaseDate: "2026-04-24",
  parent: "RBW-BICRS-GEN-V1.1 (BiCRS)",
  standard: "Rainbow Standard",
  operator: "Riverse SAS",
  lcaStandard: "ISO 14064-2:2019",
  functionalUnit: "1 tonne of biochar applied (carbon storage solution)",
} as const;

/** Production batch validity — 6 months OR 200 tonnes, whichever comes first. */
export const BATCH_LIMITS = {
  maxMonths: 6,
  maxTonnes: 200,
  /** Warn when a batch crosses this fraction of either limit. */
  warnFraction: 0.8,
} as const;

/** Molar H/C_org ratio — eligibility & stability indicator (lower = more stable). */
export const HC_ORG = {
  /** Biochar is ineligible as durable carbon if H/C_org ≥ 0.7. */
  maxEligible: 0.7,
  /** High-permanence band used for guidance in the UI. */
  strongBand: 0.4,
} as const;

/** CO₂ / C molecular-mass ratio (44/12). */
export const CO2_PER_C = 3.6667;

/** Durability pathways a project may claim. */
export const DURABILITY_PATHWAYS = {
  years100: {
    years: 100,
    label: "100-year permanence",
    method: "H/C_org regression (temperature-dependent)",
  },
  years1000: {
    years: 1000,
    label: "1000-year permanence",
    method: "Random reflectance (R_o) — requires reflectance measurement",
  },
} as const;

/**
 * 100-year permanence fraction:  F_perm = c − m × (H/C_org)
 * Temperature-dependent regression coefficients keyed by mean annual soil temperature.
 * Source: biochar-application-to-soils storage module (IPCC 2019 Refinement basis).
 */
export const PERMANENCE_100_COEFFS = [
  { maxSoilTempC: 7.49, c: 1.13, m: 0.46, label: "< 7.5 °C" },
  { maxSoilTempC: 12.49, c: 1.1, m: 0.59, label: "7.5 – 12.5 °C" },
  { maxSoilTempC: 17.49, c: 1.04, m: 0.64, label: "12.5 – 17.5 °C" },
  { maxSoilTempC: 22.49, c: 1.01, m: 0.65, label: "17.5 – 22.5 °C" },
  { maxSoilTempC: Infinity, c: 0.98, m: 0.66, label: "> 22.5 °C" },
] as const;

/** Baseline: fraction of feedstock carbon assumed permanently stored anyway (0.5%). */
export const BASELINE = {
  feedstockCarbonStoredFraction: 0.005,
  /** Minimum discount applied to projects claiming baseline storage (high uncertainty). */
  minDiscountFraction: 0.03,
} as const;

/** Buffer pool — insurance against reversal. */
export const BUFFER_POOL = {
  /** Minimum share of verified removal RCCs transferred to the buffer (rounded up). */
  minFraction: 0.02,
} as const;

/** Global Warming Potentials — IPCC AR6, 100-year. */
export const GWP_AR6 = {
  CO2: 1,
  CH4_fossil: 29.8,
  CH4_biogenic: 27,
  N2O: 273,
  HFC134a: 1526,
} as const;

/**
 * Default transport combustion emission factors (kg CO₂e / kg fuel) — Transport module Table 4.
 */
export const TRANSPORT_FUEL_EF = {
  diesel: 3.2,
  biodiesel: 0.19,
  bioethanol: 0.0114,
  heavy_fuel_oil: 3.15,
} as const;

/**
 * Distance-based transport EFs (kg CO₂e / tonne·km) — representative defaults by mode/class,
 * used by the distance-based transport method (E = Σ D × W × EF).
 */
export const TRANSPORT_DISTANCE_EF = {
  truck_light: 0.62, // < 7.5 t, low load factor (28%)
  truck_medium: 0.21, // 7.5 – 32 t (30%)
  truck_heavy: 0.09, // > 32 t (89%)
  ship_container: 0.016,
  ship_bulk: 0.008,
  rail_freight: 0.028,
} as const;

/** Uncertainty discount factors applied to net results (GHG quantification rules). */
export const UNCERTAINTY_DISCOUNTS = [
  { key: "low", label: "Low (90–99% confidence)", discount: 0.03 },
  { key: "medium", label: "Medium (66–90% confidence)", discount: 0.06 },
  { key: "high", label: "High (50–66% confidence)", discount: 0.09 },
  { key: "very_high", label: "Very high (<50%) — ineligible", discount: 0.15 },
] as const;

/** Certification / verification cadence (BiCRS shared rules). */
export const CERTIFICATION = {
  maxCreditingPeriodYears: 5,
  defaultMonitoringPeriodMonths: 12,
  maxSubmissionCadenceMonths: 24,
  /** Projects issuing more RCCs/yr than this require an in-person audit. */
  inPersonAuditThresholdRccPerYear: 5000,
  /** Reversal = re-release of ≥ 1 tCO₂e of previously sequestered carbon. */
  reversalThresholdTco2e: 1,
} as const;

/** Approved feedstock categories (Biomass feedstock module positive list). */
export const FEEDSTOCK_CATEGORIES = [
  { key: "forest_secondary", label: "Forest waste — secondary forest" },
  { key: "forest_managed", label: "Forest waste — managed forest" },
  { key: "tree_removal", label: "Necessary tree removal" },
  { key: "ag_residue_valued", label: "Agricultural residues — with value" },
  { key: "ag_residue_no_value", label: "Agricultural residues — no value" },
  { key: "other_waste", label: "Other waste or residue" },
  { key: "invasive_species", label: "Invasive species" },
] as const;

export const FEEDSTOCK_POSITIVE_LIST = [
  "Sawmill residues",
  "Sawdust",
  "Wood shavings",
  "Bark",
  "Forestry tops & branches",
  "Wildfire-management residues",
  "Straw",
  "Rice / grain husks",
  "Corn cobs",
  "Horticultural wood",
  "Nut shells",
  "Bagasse",
  "Sugar beet pulp",
] as const;

/** Forestry certification schemes accepted for forest-origin biomass. */
export const FORESTRY_CERTIFICATIONS = ["FSC", "PEFC", "RSB", "SFI", "SBP"] as const;

/** Open-kiln required photographic evidence per kiln run. */
export const REQUIRED_RUN_PHOTOS = [
  { key: "pyrolysis", label: "Clean pyrolysis process" },
  { key: "flame_curtain", label: "Flame curtain" },
  { key: "quench", label: "Quenching" },
] as const;
export type RequiredPhotoType = (typeof REQUIRED_RUN_PHOTOS)[number]["key"];

/** Kiln types — open-kiln methodology requires cone / flame-curtain designs. */
export const KILN_TYPES = [
  { key: "flame_curtain_cone", label: "Cone flame-curtain (Kon-Tiki)" },
  { key: "flame_curtain_trench", label: "Trench flame-curtain" },
  { key: "flame_curtain_shielded", label: "Shielded flame-curtain" },
] as const;

/** RCC credit mechanisms — accounted separately. */
export const CREDIT_TYPES = {
  removal: { key: "removal", code: "RMV", label: "Removal" },
  avoidance: { key: "avoidance", code: "AVD", label: "Avoidance" },
} as const;

/** Serial number format helper: RCC-BIO-{CC}-{PROJECT}-{VINTAGE}-{RMV|AVD}-{NNNNNN}. */
export const SERIAL = {
  registryPrefix: "RCC",
  assetCode: "BIO",
  seqPad: 6,
} as const;

export type MethodologyRule = {
  id: string;
  title: string;
  detail: string;
};

/** Human-readable rule catalogue surfaced in the UI (e.g. onboarding & help). */
export const RULE_CATALOGUE: MethodologyRule[] = [
  {
    id: "batch-validity",
    title: "Production batch validity",
    detail:
      "A production batch is biochar made under the same kiln type, feedstock, and temperature curve. It is valid for a maximum of 6 months or 200 tonnes — whichever comes first.",
  },
  {
    id: "photos",
    title: "Required photographic evidence",
    detail:
      "Every open-kiln run must document photos of the clean pyrolysis process, the flame curtain, and quenching before it can be marked complete.",
  },
  {
    id: "hc-eligibility",
    title: "Permanence eligibility",
    detail:
      "Biochar must have a molar H/C_org ratio below 0.7 to qualify as durable carbon. Lower ratios indicate higher stability.",
  },
  {
    id: "sampling",
    title: "Composite sampling chain",
    detail:
      "Each run contributes a subsample to the Site Composite Pile. On batch completion, a Site Composite Sample is drawn, combined across sites into the Production Batch Composite Pile, and a Representative Sample is sent to an accredited laboratory.",
  },
  {
    id: "separation",
    title: "Separation of duties",
    detail:
      "Those who produce biochar (kiln operators) are strictly separated from those who review and report the data (supervisors, developers, verifiers) to prevent conflicts of interest.",
  },
  {
    id: "buffer",
    title: "Buffer pool contribution",
    detail:
      "At least 2% of verified removal RCCs are transferred to the shared Rainbow Buffer Pool on issuance, rounded up to the nearest whole credit, as insurance against reversal.",
  },
  {
    id: "accounting",
    title: "Removal vs avoidance",
    detail:
      "Removal and avoidance credits use completely separate accounting mechanisms and are never mixed.",
  },
];
