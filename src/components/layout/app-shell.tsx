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
} from "@/components/common/icons";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/common/logo";
import { visibleNav, PROJECT_ROLE_LABEL } from "@/lib/nav";
import type { NavItem, NavSection } from "@/lib/nav";
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
 * "Credit registry" stays active on /registry and /registry/<serial>, but not
 * on /registry/buffer, which is its own item.
 */
function isItemActive(href: string, pathname: string) {
  return (
    pathname === href ||
    (href !== "/dashboard" && href !== "/registry" && pathname.startsWith(href)) ||
    (href === "/registry" &&
      pathname.startsWith("/registry") &&
      !pathname.startsWith("/registry/buffer"))
  );
}

function NavRow({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = isItemActive(item.href, pathname);
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-md px-2.5 py-2 text-[15px] transition-colors",
          isActive ? "bg-surface-2 text-ink" : "text-ink-soft hover:bg-surface hover:text-ink",
        )}
      >
        <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-brand" : "text-muted")} />
        {item.label}
      </Link>
    </li>
  );
}


/**
 * The bell and the account menu appear twice — in the desktop bar, which is
 * dark, and in the mobile panel, which is light — so each takes a tone rather
 * than being written out twice.
 */
function NotificationsLink({
  unreadCount,
  tone,
}: {
  unreadCount: number;
  tone: "dark" | "light";
}) {
  return (
    <Link
      href="/notifications"
      className={cn(
        "relative grid h-10 w-10 place-items-center rounded-md transition-colors",
        tone === "dark"
          ? "text-white/70 hover:bg-white/10 hover:text-white"
          : "text-ink-soft hover:bg-surface-2 hover:text-ink",
      )}
      aria-label="Notifications"
    >
      <Alert16Regular className="h-[22px] w-[22px]" />
      {unreadCount > 0 && (
        <span className="absolute top-1.5 right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-err px-1 text-[9px] font-semibold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}

function AccountMenu({
  profile,
  roleLabel,
  tone,
}: {
  profile: ShellProps["profile"];
  roleLabel: string;
  tone: "dark" | "light";
}) {
  return (
    <Dropdown>
      <DropdownTrigger
        className={cn(
          "grid h-10 w-10 place-items-center rounded-md transition-colors",
          tone === "dark" ? "hover:bg-white/10" : "hover:bg-surface-2",
        )}
        aria-label="Account"
      >
        <Avatar name={profile.full_name} size={30} />
      </DropdownTrigger>
      <DropdownContent align="end">
        <div className="px-2.5 py-2">
          <p className="text-sm font-medium text-ink truncate">{profile.full_name}</p>
          <p className="text-xs text-muted truncate">{profile.email}</p>
          <p className="text-xs text-muted truncate mt-0.5">{roleLabel}</p>
          {profile.organization && (
            <p className="text-xs text-muted truncate">{profile.organization}</p>
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

  const sections = visibleNav(can);
  const activeSection: NavSection | undefined =
    sections.find((s) => s.items.some((i) => isItemActive(i.href, pathname))) ?? sections[0];

  // A section with a single page has nothing to put in a rail — the top-bar tab
  // already is that page — so the workspace takes the full width instead.
  const showRail = (activeSection?.items.length ?? 0) > 1;

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-brand-deep">
      {/* Top bar — brand, the section tabs, search and the account. */}
      <header className="hidden lg:flex h-[68px] shrink-0 items-center gap-2 px-5 bg-brand-deep">
        <Link href="/dashboard" className="flex items-center shrink-0">
          <Logo variant="white" height={32} />
        </Link>

        {/* Section tabs. Each opens its first page; the rail then carries the
            rest of that section. */}
        <nav className="hidden lg:flex items-center gap-0.5 ml-3 min-w-0 flex-1 overflow-x-auto scrollbar-none">
          {sections.map((section) => {
            const on = section.title === activeSection?.title;
            const SectionIcon = section.icon;
            return (
              <Link
                key={section.title}
                href={section.items[0].href}
                className={cn(
                  "relative flex h-[68px] items-center gap-2.5 px-3.5 text-[15px] whitespace-nowrap transition-colors",
                  on ? "text-white" : "text-white/65 hover:text-white",
                )}
              >
                <SectionIcon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-colors",
                    on ? "text-brand-accent" : "text-white/55",
                  )}
                />
                {section.title}
                {/* The marker is fullest under the label and thins away at both
                    ends, so it reads as a highlight rather than a drawn border. */}
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-x-1 bottom-2.5 h-[3px] rounded-full transition-opacity duration-200",
                    on ? "opacity-100" : "opacity-0",
                  )}
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(6,156,106,0) 0%, rgba(6,156,106,0.55) 18%, var(--color-brand-accent) 50%, rgba(6,156,106,0.55) 82%, rgba(6,156,106,0) 100%)",
                  }}
                />
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {/* Project switcher */}
          {active && (
            <Dropdown>
              <DropdownTrigger className="hidden sm:flex items-center gap-2 rounded-md border border-white/15 bg-white/[0.08] px-3 py-2 text-[14px] text-white hover:bg-white/[0.14] transition-colors max-w-56 shrink-0">
                <span className="grid h-5 w-5 place-items-center rounded bg-white/15 font-mono text-[10px]">
                  {active.code}
                </span>
                <span className="truncate">{active.name}</span>
                <ChevronUpDown16Regular className="h-3.5 w-3.5 text-white/60 shrink-0" />
              </DropdownTrigger>
              <DropdownContent align="end" className="min-w-64">
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

          <NotificationsLink unreadCount={unreadCount} tone="dark" />
          <AccountMenu profile={profile} roleLabel={roleLabel} tone="dark" />
        </div>
      </header>

      {/* The workspace is a light panel inset on the dark ground, framed on the
          sides and foot. It holds its own height: the panel never scrolls, only
          the rail and the content within it do. */}
      <div className="flex-1 min-h-0 px-2 pb-2 max-lg:pt-2 max-lg:pb-[calc(4.75rem+env(safe-area-inset-bottom))]">
        <div className="h-full flex overflow-hidden rounded-[14px] bg-surface">
          {showRail && activeSection && (
            <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border bg-elevated overflow-y-auto overscroll-contain scrollbar-none">
              <nav className="flex-1 px-2.5 py-4">
                <ul className="space-y-0.5">
                  {activeSection.items.map((item) => (
                    <NavRow key={item.href} item={item} pathname={pathname} />
                  ))}
                </ul>
              </nav>
            </aside>
          )}

          <main className="flex-1 min-w-0 overflow-y-auto overscroll-contain scrollbar-none bg-surface px-5 md:px-7 py-5 md:py-6">
            {/* On a phone the account and the bell live here, since there is no
                bar above the panel to hold them. */}
            <div className="mb-3 flex items-center justify-between lg:hidden">
              <AccountMenu profile={profile} roleLabel={roleLabel} tone="light" />
              <NotificationsLink unreadCount={unreadCount} tone="light" />
            </div>
            {children}
          </main>
        </div>
      </div>

      {/* Bottom bar — the sections the top tabs carry on a wide screen. Four
          fit comfortably; the rest live behind More, which opens the drawer.
          A thumb reaches the bottom of a phone, not a hamburger in the corner. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-elevated pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Sections"
      >
        {sections.slice(0, 4).map((section) => {
          const on = section.title === activeSection?.title && !open;
          const SectionIcon = section.icon;
          return (
            <Link
              key={section.title}
              href={section.items[0].href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-colors",
                on ? "text-brand" : "text-muted",
              )}
            >
              {/* The glow sits behind the icon, so selection reads before the
                  label does. */}
              {on && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-2 top-1.5 h-9 rounded-full bg-brand-accent/18 blur-md"
                />
              )}
              <SectionIcon className="relative h-7 w-7 shrink-0" />
              <span className="relative max-w-full truncate px-1 text-[11px] font-medium leading-tight">
                {section.title}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          className={cn(
            "relative flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-colors",
            open ? "text-brand" : "text-muted",
          )}
        >
          {open && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-2 top-1.5 h-9 rounded-full bg-brand-accent/18 blur-md"
            />
          )}
          <Navigation16Regular className="relative h-7 w-7 shrink-0" />
          <span className="relative text-[11px] font-medium leading-tight">More</span>
        </button>
      </nav>

      {/* Mobile drawer keeps the whole tree, since there is no room for tabs. */}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-ink/40 lg:hidden" onClick={() => setOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-elevated lg:hidden">
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
            <nav className="flex-1 overflow-y-auto scrollbar-none px-2.5 py-4 space-y-5">
              {sections.map((section) => (
                <div key={section.title}>
                  <p className="px-2.5 mb-1.5 text-[12px] text-muted">{section.title}</p>
                  <ul className="space-y-0.5">
                    {section.items.map((item) => (
                      <NavRow key={item.href} item={item} pathname={pathname} />
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>
        </>
      )}
    </div>
  );
}

export { PROJECT_ROLE_LABEL };
