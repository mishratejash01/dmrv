import type { FluentIcon } from "@/components/common/icons";
import {
  Beaker20Regular,
  Beaker20Filled,
  Board20Regular,
  Board20Filled,
  BoxMultipleRegular,
  BoxMultipleFilled,
  CheckboxChecked20Regular,
  CheckboxChecked20Filled,
  ClipboardTaskListLtrRegular,
  ClipboardTaskListLtrFilled,
  DataBarVertical20Regular,
  DataBarVertical20Filled,
  Fire20Regular,
  Fire20Filled,
  LeafOne20Regular,
  LeafOne20Filled,
  Location20Regular,
  Location20Filled,
  Organization20Regular,
  Organization20Filled,
  People20Regular,
  People20Filled,
  PlantGrassRegular,
  PlantGrassFilled,
  Ribbon20Regular,
  Ribbon20Filled,
  Scales20Regular,
  Scales20Filled,
  Settings20Regular,
  Settings20Filled,
  ShieldCheckmark20Regular,
  ShieldCheckmark20Filled,
  Wallet20Regular,
  Wallet20Filled,
} from "@/components/common/icons";
import type { AppCapabilities } from "@/lib/auth";

export interface NavItem {
  href: string;
  label: string;
  icon: FluentIcon;
  iconActive: FluentIcon;
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
      { href: "/dashboard", label: "Dashboard", icon: Board20Regular, iconActive: Board20Filled },
      { href: "/analytics", label: "Analytics", icon: DataBarVertical20Regular, iconActive: DataBarVertical20Filled },
      { href: "/traceability", label: "Traceability", icon: Organization20Regular, iconActive: Organization20Filled },
    ],
  },
  {
    title: "Field operations",
    items: [
      { href: "/field", label: "Field log", icon: Fire20Regular, iconActive: Fire20Filled, show: (c) => c.canOperate },
      { href: "/runs", label: "Kiln runs", icon: ClipboardTaskListLtrRegular, iconActive: ClipboardTaskListLtrFilled },
      { href: "/review", label: "Review queue", icon: CheckboxChecked20Regular, iconActive: CheckboxChecked20Filled, show: (c) => c.canReview },
    ],
  },
  {
    title: "Production",
    items: [
      { href: "/batches", label: "Production batches", icon: BoxMultipleRegular, iconActive: BoxMultipleFilled },
      { href: "/feedstock", label: "Feedstock", icon: PlantGrassRegular, iconActive: PlantGrassFilled },
      { href: "/sites", label: "Sites & kilns", icon: Location20Regular, iconActive: Location20Filled },
    ],
  },
  {
    title: "Science & carbon",
    items: [
      { href: "/lab", label: "Lab tests", icon: Beaker20Regular, iconActive: Beaker20Filled },
      { href: "/ghg", label: "GHG quantification", icon: Scales20Regular, iconActive: Scales20Filled },
      { href: "/end-use", label: "End-use", icon: LeafOne20Regular, iconActive: LeafOne20Filled },
      { href: "/verification", label: "Verification", icon: ShieldCheckmark20Regular, iconActive: ShieldCheckmark20Filled },
    ],
  },
  {
    title: "Registry",
    items: [
      { href: "/registry", label: "Credit registry", icon: Ribbon20Regular, iconActive: Ribbon20Filled },
      { href: "/registry/buffer", label: "Buffer pool", icon: Wallet20Regular, iconActive: Wallet20Filled },
    ],
  },
  {
    title: "Manage",
    items: [
      { href: "/team", label: "Team & roles", icon: People20Regular, iconActive: People20Filled, show: (c) => c.canManageProject },
      { href: "/settings", label: "Settings", icon: Settings20Regular, iconActive: Settings20Filled },
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
