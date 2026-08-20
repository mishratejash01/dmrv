"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Navigation16Regular,
  Dismiss16Regular,
  Alert16Regular,
  ChevronUpDown16Regular,
  Checkmark16Regular,
  SignOutRegular,
  ChevronDown16Regular,
} from "@/components/common/icons";
import { cn } from "@/lib/utils";
import { LogoLockup } from "@/components/common/logo";
import { visibleNav, PROJECT_ROLE_LABEL } from "@/lib/nav";
import type { AppCapabilities } from "@/lib/auth";
import { Avatar } from "@/components/ui/avatar";
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
          "fixed inset-y-0 left-0 z-40 w-52 flex flex-col transition-transform lg:translate-x-0",
          "bg-brand-deep",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* One soft fall of light down the rail, so the green reads as a surface
            rather than a flat fill. Nothing else is layered on it. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0)_220px)]"
        />

        <div className="relative h-14 flex items-center gap-2.5 px-4 border-b border-white/10 shrink-0">
          <LogoLockup variant="white" height={18} />
          <button
            className="ml-auto lg:hidden text-white/60 hover:text-white transition-colors"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <Dismiss16Regular className="h-5 w-5" />
          </button>
        </div>

        <nav className="relative flex-1 overflow-y-auto py-3 space-y-5">
          {sections.map((section) => (
            <div key={section.title}>
              {/* Label then a hairline running to the edge — the divider off a
                  printed register, not a floating pill header. */}
              <div className="pl-3.5 pr-3 mb-1">
                <span className="text-[11px] font-medium text-white/40">{section.title}</span>
              </div>
              <ul>
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
                          "flex items-center gap-2.5 border-l-2 py-1.5 pl-3.5 pr-3 text-sm transition-colors",
                          isActive
                            ? "border-brand-accent bg-white/[0.07] text-white font-medium"
                            : "border-transparent text-white/65 hover:bg-white/[0.04] hover:text-white",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-5 w-5 shrink-0",
                            isActive ? "text-brand-accent" : "text-white/70",
                          )}
                        />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="relative border-t border-white/10 px-4 py-3 shrink-0">
          <p className="text-[11px] text-white/35">Signed in as</p>
          <p className="mt-0.5 text-[12px] text-brand-accent truncate">{roleLabel}</p>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main column */}
      <div className="flex-1 lg:pl-52 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-14 border-b border-border bg-base/85 backdrop-blur flex items-center gap-3 px-3 md:px-4">
          <button
            className="lg:hidden text-ink-soft"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Navigation16Regular className="h-5 w-5" />
          </button>

          {/* Project switcher */}
          {active && (
            <Dropdown>
              <DropdownTrigger className="flex items-center gap-2 rounded-lg border border-border bg-elevated px-3 py-1.5 text-sm hover:bg-surface transition-colors max-w-64">
                <span className="grid h-6 w-6 place-items-center rounded bg-sage-tint font-mono text-[10px] font-medium text-[#2e7d32]">
                  {active.code}
                </span>
                <span className="truncate text-ink font-medium">{active.name}</span>
                <ChevronUpDown16Regular className="h-3.5 w-3.5 text-muted shrink-0" />
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
                    {p.id === active.id && <Checkmark16Regular className="h-4 w-4 text-clay" />}
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
              <Alert16Regular className="h-4.5 w-4.5" />
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
                <ChevronDown16Regular className="h-3.5 w-3.5 text-muted hidden sm:block" />
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
                  <Link href="/settings">Settings16Regular</Link>
                </DropdownItem>
                <DropdownItem asChild>
                  <Link href="/registry-public">Public registry</Link>
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem onSelect={() => signOutAction()} className="text-err data-[highlighted]:text-err">
                  <SignOutRegular className="text-err" /> Sign out
                </DropdownItem>
              </DropdownContent>
            </Dropdown>
          </div>
        </header>

        <main className="flex-1 w-full min-w-0 px-3 md:px-4 py-3 md:py-4">
          {children}
        </main>
      </div>
    </div>
  );
}

export { PROJECT_ROLE_LABEL };
