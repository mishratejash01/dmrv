"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Bell,
  ChevronsUpDown,
  Check,
  LogOut,
  Leaf,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import { visibleNav, PROJECT_ROLE_LABEL } from "@/lib/nav";
import type { AppCapabilities } from "@/lib/auth";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
} from "@/components/ui/dropdown";
import { setActiveProject, signOutAction } from "@/lib/actions/session";

export interface ShellProject {
  id: string;
  name: string;
  code: string;
}

export interface ShellProps {
  profile: { full_name: string; email: string; organization: string | null };
  projects: ShellProject[];
  activeProjectId: string | null;
  can: AppCapabilities;
  roleLabel: string;
  unreadCount: number;
  children: React.ReactNode;
}

export function AppShell({
  profile,
  projects,
  activeProjectId,
  can,
  roleLabel,
  unreadCount,
  children,
}: ShellProps) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const sections = visibleNav(can);
  const active = projects.find((p) => p.id === activeProjectId) ?? projects[0];

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen flex bg-base">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-elevated flex flex-col transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border shrink-0">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-clay text-elevated">
            <Leaf className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <p className="font-display text-[15px] text-ink">{BRAND.product}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted">{BRAND.domainLabel}</p>
          </div>
          <button
            className="ml-auto lg:hidden text-muted"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      item.href !== "/registry" &&
                      pathname.startsWith(item.href)) ||
                    // "Credit registry" stays active on /registry and /registry/<serial>,
                    // but not on /registry/buffer (its own nav item).
                    (item.href === "/registry" &&
                      pathname.startsWith("/registry") &&
                      !pathname.startsWith("/registry/buffer"));
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                          isActive
                            ? "bg-clay-tint text-[#8a5f38] font-medium"
                            : "text-ink-soft hover:bg-surface hover:text-ink",
                        )}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-clay" : "text-muted")} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3 shrink-0">
          <Badge tone="sage" className="w-full justify-center">
            {roleLabel}
          </Badge>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main column */}
      <div className="flex-1 lg:pl-64 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-16 border-b border-border bg-base/85 backdrop-blur flex items-center gap-3 px-4 md:px-6">
          <button
            className="lg:hidden text-ink-soft"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Project switcher */}
          {active && (
            <Dropdown>
              <DropdownTrigger className="flex items-center gap-2 rounded-lg border border-border bg-elevated px-3 py-1.5 text-sm hover:bg-surface transition-colors max-w-64">
                <span className="grid h-6 w-6 place-items-center rounded bg-sage-tint text-[11px] font-medium text-[#5c6a4c]">
                  {active.code}
                </span>
                <span className="truncate text-ink font-medium">{active.name}</span>
                <ChevronsUpDown className="h-3.5 w-3.5 text-muted shrink-0" />
              </DropdownTrigger>
              <DropdownContent align="start" className="min-w-64">
                <DropdownLabel>Switch project</DropdownLabel>
                {projects.map((p) => (
                  <DropdownItem
                    key={p.id}
                    onSelect={() => setActiveProject(p.id)}
                    className="justify-between"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="grid h-5 w-5 place-items-center rounded bg-surface-2 text-[10px] font-medium text-ink-soft">
                        {p.code}
                      </span>
                      <span className="truncate">{p.name}</span>
                    </span>
                    {p.id === active.id && <Check className="h-4 w-4 text-clay" />}
                  </DropdownItem>
                ))}
              </DropdownContent>
            </Dropdown>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            <Link
              href="/notifications"
              className="relative grid h-9 w-9 place-items-center rounded-lg text-ink-soft hover:bg-surface transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-4.5 w-4.5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-err px-1 text-[9px] font-semibold text-elevated">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>

            {/* User menu */}
            <Dropdown>
              <DropdownTrigger className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-surface transition-colors">
                <Avatar name={profile.full_name} size={32} />
                <span className="hidden sm:block text-left leading-tight">
                  <span className="block text-sm text-ink font-medium max-w-32 truncate">
                    {profile.full_name}
                  </span>
                  <span className="block text-[11px] text-muted max-w-32 truncate">{roleLabel}</span>
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted hidden sm:block" />
              </DropdownTrigger>
              <DropdownContent>
                <div className="px-2.5 py-2">
                  <p className="text-sm font-medium text-ink truncate">{profile.full_name}</p>
                  <p className="text-xs text-muted truncate">{profile.email}</p>
                  {profile.organization && (
                    <p className="text-xs text-muted truncate mt-0.5">{profile.organization}</p>
                  )}
                </div>
                <DropdownSeparator />
                <DropdownItem asChild>
                  <Link href="/settings">Settings</Link>
                </DropdownItem>
                <DropdownItem asChild>
                  <Link href="/registry-public">Public registry</Link>
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem onSelect={() => signOutAction()} className="text-err data-[highlighted]:text-err">
                  <LogOut className="text-err" /> Sign out
                </DropdownItem>
              </DropdownContent>
            </Dropdown>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-6 lg:px-8 py-6 md:py-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export { PROJECT_ROLE_LABEL };
