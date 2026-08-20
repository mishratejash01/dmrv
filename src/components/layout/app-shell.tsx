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
import { Logo } from "@/components/common/logo";
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

/**
 * The nav list, shared by the docked rail and the mobile drawer so the two can
 * never drift apart.
 */
function NavList({ can, pathname }: { can: AppCapabilities; pathname: string }) {
  return (
    <nav className="flex-1 overflow-y-auto scrollbar-none px-2.5 py-4 space-y-6">
      {visibleNav(can).map((section) => (
        <div key={section.title}>
          <p className="px-2.5 mb-1.5 text-[12px] text-muted">{section.title}</p>
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
                      "flex items-center gap-3 rounded-md px-2.5 py-2 text-[15px] transition-colors",
                      isActive
                        ? "bg-surface-2 text-ink"
                        : "text-ink-soft hover:bg-surface hover:text-ink",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 shrink-0",
                        isActive ? "text-brand" : "text-muted",
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
  );
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
  const active = projects.find((p) => p.id === activeProjectId) ?? projects[0];

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-brand-deep">
      {/* Top bar — the dark band carries the brand and the account. */}
      <header className="h-14 shrink-0 flex items-center gap-3 px-4 bg-brand-deep">
        <button
          className="lg:hidden text-white/70 hover:text-white transition-colors"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          <Navigation16Regular className="h-5 w-5" />
        </button>

        <Link href="/dashboard" className="flex items-center shrink-0">
          <Logo variant="white" height={26} />
        </Link>

        {/* Project switcher */}
        {active && (
          <Dropdown>
            <DropdownTrigger className="ml-3 hidden sm:flex items-center gap-2 rounded-md border border-white/15 bg-white/[0.08] px-2.5 py-1.5 text-sm text-white hover:bg-white/[0.14] transition-colors max-w-64">
              <span className="grid h-5 w-5 place-items-center rounded bg-white/15 font-mono text-[10px]">
                {active.code}
              </span>
              <span className="truncate">{active.name}</span>
              <ChevronUpDown16Regular className="h-3.5 w-3.5 text-white/60 shrink-0" />
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
                    <span className="grid h-5 w-5 place-items-center rounded bg-surface-2 font-mono text-[10px] text-ink-soft">
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
            className="relative grid h-9 w-9 place-items-center rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Notifications"
          >
            <Alert16Regular className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-err px-1 text-[9px] font-semibold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>

          {/* User menu */}
          <Dropdown>
            <DropdownTrigger className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-white/10 transition-colors">
              <Avatar name={profile.full_name} size={30} />
              <span className="hidden sm:block text-left leading-tight">
                <span className="block text-sm text-white max-w-32 truncate">
                  {profile.full_name}
                </span>
                <span className="block text-[11px] text-white/55 max-w-32 truncate">
                  {roleLabel}
                </span>
              </span>
              <ChevronDown16Regular className="h-3.5 w-3.5 text-white/60 hidden sm:block" />
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
              <DropdownItem
                onSelect={() => signOutAction()}
                className="text-err data-[highlighted]:text-err"
              >
                <SignOutRegular className="text-err" /> Sign out
              </DropdownItem>
            </DropdownContent>
          </Dropdown>
        </div>
      </header>

      {/* The workspace is a light panel inset on the dark ground, framed on the
          sides and foot. It holds its own height: the panel never scrolls, only
          the rail and the content within it do. */}
      <div className="flex-1 min-h-0 px-2 pb-2">
        <div className="h-full flex overflow-hidden rounded-[14px] bg-base">
          <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border bg-elevated overflow-y-auto scrollbar-none">
            <NavList can={can} pathname={pathname} />
          </aside>

          <main className="flex-1 min-w-0 overflow-y-auto scrollbar-none px-3 md:px-4 py-3 md:py-4">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-60 flex flex-col bg-elevated lg:hidden">
            <div className="h-14 flex items-center px-4 shrink-0 border-b border-border">
              <span className="text-sm text-ink-soft">Menu</span>
              <button
                className="ml-auto text-muted hover:text-ink transition-colors"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                <Dismiss16Regular className="h-5 w-5" />
              </button>
            </div>
            <NavList can={can} pathname={pathname} />
          </aside>
        </>
      )}
    </div>
  );
}

export { PROJECT_ROLE_LABEL };
