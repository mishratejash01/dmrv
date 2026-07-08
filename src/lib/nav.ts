import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  BarChart3,
  Flame,
  ClipboardList,
  CheckSquare,
  Boxes,
  Sprout,
  MapPin,
  FlaskConical,
  Scale,
  Leaf,
  ShieldCheck,
  BadgeCheck,
  Network,
  Users,
  Settings,
  Wallet,
} from "lucide-react";
import type { AppCapabilities } from "@/lib/auth";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
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
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/traceability", label: "Traceability", icon: Network },
    ],
  },
  {
    title: "Field operations",
    items: [
      { href: "/field", label: "Field log", icon: Flame, show: (c) => c.canOperate },
      { href: "/runs", label: "Kiln runs", icon: ClipboardList },
      { href: "/review", label: "Review queue", icon: CheckSquare, show: (c) => c.canReview },
    ],
  },
  {
    title: "Production",
    items: [
      { href: "/batches", label: "Production batches", icon: Boxes },
      { href: "/feedstock", label: "Feedstock", icon: Sprout },
      { href: "/sites", label: "Sites & kilns", icon: MapPin },
    ],
  },
  {
    title: "Science & carbon",
    items: [
      { href: "/lab", label: "Lab tests", icon: FlaskConical },
      { href: "/ghg", label: "GHG quantification", icon: Scale },
      { href: "/end-use", label: "End-use", icon: Leaf },
      { href: "/verification", label: "Verification", icon: ShieldCheck },
    ],
  },
  {
    title: "Registry",
    items: [
      { href: "/registry", label: "Credit registry", icon: BadgeCheck },
      { href: "/registry/buffer", label: "Buffer pool", icon: Wallet },
    ],
  },
  {
    title: "Manage",
    items: [
      { href: "/team", label: "Team & roles", icon: Users, show: (c) => c.canManageProject },
      { href: "/settings", label: "Settings", icon: Settings },
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
