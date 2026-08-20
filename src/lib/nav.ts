import type { FluentIcon } from "@/components/common/icons";
import {
  Beaker20Filled,
  BookDatabase20Filled,
  BoxMultiple20Filled,
  BuildingFactory20Filled,
  ClipboardCheckmark20Filled,
  DataTrending20Filled,
  Fire20Filled,
  Flowchart20Filled,
  Home20Filled,
  LeafThree20Filled,
  Molecule20Filled,
  Notepad20Filled,
  People20Filled,
  PlantGrass20Filled,
  Settings20Filled,
  ShieldCheckmark20Filled,
  Vault20Filled,
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
  icon: FluentIcon;
  items: NavItem[];
}

export const NAV: NavSection[] = [
  {
    title: "Overview",
    icon: Home20Filled,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Home20Filled },
      { href: "/analytics", label: "Analytics", icon: DataTrending20Filled },
      { href: "/traceability", label: "Traceability", icon: Flowchart20Filled },
    ],
  },
  {
    title: "Field operations",
    icon: Fire20Filled,
    items: [
      { href: "/field", label: "Field log", icon: Notepad20Filled, show: (c) => c.canOperate },
      { href: "/runs", label: "Kiln runs", icon: Fire20Filled },
      { href: "/review", label: "Review queue", icon: ClipboardCheckmark20Filled, show: (c) => c.canReview },
    ],
  },
  {
    title: "Production",
    icon: BoxMultiple20Filled,
    items: [
      { href: "/batches", label: "Production batches", icon: BoxMultiple20Filled },
      { href: "/feedstock", label: "Feedstock", icon: PlantGrass20Filled },
      { href: "/sites", label: "Sites & kilns", icon: BuildingFactory20Filled },
    ],
  },
  {
    title: "Science & carbon",
    icon: Beaker20Filled,
    items: [
      { href: "/lab", label: "Lab tests", icon: Beaker20Filled },
      { href: "/ghg", label: "GHG quantification", icon: Molecule20Filled },
      { href: "/end-use", label: "End-use", icon: LeafThree20Filled },
      { href: "/verification", label: "Verification", icon: ShieldCheckmark20Filled },
    ],
  },
  {
    title: "Registry",
    icon: BookDatabase20Filled,
    items: [
      { href: "/registry", label: "Credit registry", icon: BookDatabase20Filled },
      { href: "/registry/buffer", label: "Buffer pool", icon: Vault20Filled },
    ],
  },
  {
    title: "Manage",
    icon: Settings20Filled,
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
