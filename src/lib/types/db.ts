import type { Database } from "./database";

/** Convenience aliases for table Row / Insert / Update types. */
type Tables = Database["public"]["Tables"];
export type Row<T extends keyof Tables> = Tables[T]["Row"];
export type Insert<T extends keyof Tables> = Tables[T]["Insert"];
export type Update<T extends keyof Tables> = Tables[T]["Update"];
export type Enums = Database["public"]["Enums"];

export type Profile = Row<"profiles">;
export type Project = Row<"projects">;
export type ProjectMember = Row<"project_members">;
export type Site = Row<"sites">;
export type Kiln = Row<"kilns">;
export type ApprovedFeedstock = Row<"approved_feedstocks">;
export type FeedstockBatch = Row<"feedstock_batches">;
export type ProductionBatch = Row<"production_batches">;
export type KilnRun = Row<"kiln_runs">;
export type RunPhoto = Row<"run_photos">;
export type CompositeSample = Row<"composite_samples">;
export type LabTest = Row<"lab_tests">;
export type GhgQuantification = Row<"ghg_quantifications">;
export type EndUseRecord = Row<"end_use_records">;
export type Verification = Row<"verifications">;
export type VerificationFinding = Row<"verification_findings">;
export type RccIssuance = Row<"rcc_issuances">;
export type RccCredit = Row<"rcc_credits">;
export type BufferLedger = Row<"buffer_pool_ledger">;
export type CreditTransaction = Row<"credit_transactions">;
export type SiteAudit = Row<"site_audits">;
export type Notification = Row<"notifications">;
export type AuditLog = Row<"audit_log">;

export type GlobalRole = Enums["global_role"];
export type ProjectRole = Enums["project_role"];
export type RunStatus = Enums["run_status"];
export type BatchStatus = Enums["batch_status"];
export type CreditType = Enums["credit_type"];
export type CreditStatus = Enums["credit_status"];
export type VerificationStatus = Enums["verification_status"];
export type PhotoType = Enums["photo_type"];
export type FeedstockCategory = Enums["feedstock_category"];
export type KilnType = Enums["kiln_type"];
