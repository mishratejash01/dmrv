import type { FluentIcon } from "@/components/common/icons";
import {
  Board20Regular,
  DataBarVertical20Regular,
  Fire20Regular,
  ClipboardTaskListLtrRegular,
  CheckboxChecked20Regular,
  BoxMultipleRegular,
  PlantGrassRegular,
  Location20Regular,
  Beaker20Regular,
  Scales20Regular,
  LeafOne20Regular,
  ShieldCheckmark20Regular,
  Ribbon20Regular,
  Organization20Regular,
  People20Regular,
  Settings20Regular,
  Wallet20Regular,
} from "@/components/common/icons";
import type { AppCapabilities } from "@/lib/auth";

export interface NavItem {
  href: string;
  label: string;
  icon: FluentIcon;
  show?: (c: AppCapabilities) => boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV: NavSection[] = [
  {
    title: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Board20Regular },
      { href: "/analytics", label: "Analytics", icon: DataBarVertical20Regular },
      { href: "/traceability", label: "Traceability", icon: Organization20Regular },
    ],
  },
  {
    title: "Field operations",
    items: [
      { href: "/field", label: "Field log", icon: Fire20Regular, show: (c) => c.canOperate },
      { href: "/runs", label: "Kiln runs", icon: ClipboardTaskListLtrRegular },
      { href: "/review", label: "Review queue", icon: CheckboxChecked20Regular, show: (c) => c.canReview },
    ],
  },
  {
    title: "Production",
    items: [
      { href: "/batches", label: "Production batches", icon: BoxMultipleRegular },
      { href: "/feedstock", label: "Feedstock", icon: PlantGrassRegular },
      { href: "/sites", label: "Sites & kilns", icon: Location20Regular },
    ],
  },
  {
    title: "Science & carbon",
    items: [
      { href: "/lab", label: "Lab tests", icon: Beaker20Regular },
      { href: "/ghg", label: "GHG quantification", icon: Scales20Regular },
      { href: "/end-use", label: "End-use", icon: LeafOne20Regular },
      { href: "/verification", label: "Verification", icon: ShieldCheckmark20Regular },
    ],
  },
  {
    title: "Registry",
    items: [
      { href: "/registry", label: "Credit registry", icon: Ribbon20Regular },
      { href: "/registry/buffer", label: "Buffer pool", icon: Wallet20Regular },
    ],
  },
  {
    title: "Manage",
    items: [
      { href: "/team", label: "Team & roles", icon: People20Regular, show: (c) => c.canManageProject },
      { href: "/settings", label: "Settings", icon: Settings20Regular },
    ],
  },
];

export function visibleNav(can: AppCapabilities): NavSection[] {
  return NAV.map((s) => ({
    ...s,
    items: s.items.filter((i) => (i.show ? i.show(can) : true)),
  })).filter((s) => s.items.length > 0);
}

export const PROJECT_ROLE_LABEL: Record<string, string> = {
  project_developer: "Project Developer",
  kiln_supervisor: "Kiln Supervisor",
  kiln_operator: "Kiln Operator",
  verifier: "Verifier (VVB)",
};

export const GLOBAL_ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  registry_admin: "Credit Registry", // internal issuance ledger — not the external Rainbow registry
  member: "Member",
};
