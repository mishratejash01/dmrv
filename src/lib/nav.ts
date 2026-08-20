import type { FluentIcon } from "@/components/common/icons";
import {
  Board20Filled,
  DataBarVertical20Filled,
  Fire20Filled,
  ClipboardTaskListLtrFilled,
  CheckboxChecked20Filled,
  BoxMultipleFilled,
  PlantGrassFilled,
  Location20Filled,
  Beaker20Filled,
  Scales20Filled,
  LeafOne20Filled,
  ShieldCheckmark20Filled,
  Ribbon20Filled,
  Organization20Filled,
  People20Filled,
  Settings20Filled,
  Wallet20Filled,
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
      { href: "/dashboard", label: "Dashboard", icon: Board20Filled },
      { href: "/analytics", label: "Analytics", icon: DataBarVertical20Filled },
      { href: "/traceability", label: "Traceability", icon: Organization20Filled },
    ],
  },
  {
    title: "Field operations",
    items: [
      { href: "/field", label: "Field log", icon: Fire20Filled, show: (c) => c.canOperate },
      { href: "/runs", label: "Kiln runs", icon: ClipboardTaskListLtrFilled },
      { href: "/review", label: "Review queue", icon: CheckboxChecked20Filled, show: (c) => c.canReview },
    ],
  },
  {
    title: "Production",
    items: [
      { href: "/batches", label: "Production batches", icon: BoxMultipleFilled },
      { href: "/feedstock", label: "Feedstock", icon: PlantGrassFilled },
      { href: "/sites", label: "Sites & kilns", icon: Location20Filled },
    ],
  },
  {
    title: "Science & carbon",
    items: [
      { href: "/lab", label: "Lab tests", icon: Beaker20Filled },
      { href: "/ghg", label: "GHG quantification", icon: Scales20Filled },
      { href: "/end-use", label: "End-use", icon: LeafOne20Filled },
      { href: "/verification", label: "Verification", icon: ShieldCheckmark20Filled },
    ],
  },
  {
    title: "Registry",
    items: [
      { href: "/registry", label: "Credit registry", icon: Ribbon20Filled },
      { href: "/registry/buffer", label: "Buffer pool", icon: Wallet20Filled },
    ],
  },
  {
    title: "Manage",
    items: [
      { href: "/team", label: "Team & roles", icon: People20Filled, show: (c) => c.canManageProject },
      { href: "/settings", label: "Settings", icon: Settings20Filled },
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
