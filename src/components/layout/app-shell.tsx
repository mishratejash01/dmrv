"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Navigation16Regular,
  Dismiss16Regular,
  Alert16Regular,
  ChevronUpDown16Regular,
  Checkmark16Regular,
  SignOutRegular,
  Search16Regular,
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
 * Searches the pages this user can actually reach, and goes to one. It is
 * deliberately a page finder rather than a data search: the app has no global
 * index, and a box that silently searches nothing would be worse than none.
 */
function PageSearch({ sections }: { sections: NavSection[] }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [focused, setFocused] = React.useState(false);

  const results = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return sections
      .flatMap((s) => s.items.map((i) => ({ item: i, section: s.title })))
      .filter((r) => r.item.label.toLowerCase().includes(needle))
      .slice(0, 7);
  }, [q, sections]);

  const go = (href: string) => {
    setQ("");
    setFocused(false);
    router.push(href);
  };

  return (
    <div className="relative hidden md:block w-56 lg:w-72">
      <Search16Regular className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/45" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results[0]) go(results[0].item.href);
          if (e.key === "Escape") {
            setQ("");
            e.currentTarget.blur();
          }
        }}
        placeholder="Search pages"
        aria-label="Search pages"
        className="w-full rounded-md border border-white/15 bg-white/[0.08] pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-white/45 outline-none focus:border-white/30 focus:bg-white/[0.12] transition-colors"
      />
      {focused && q.trim() && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-md border border-border bg-elevated py-1 shadow-lg">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted">No page matches “{q.trim()}”</p>
          ) : (
            results.map((r) => {
              const Icon = r.item.icon;
              return (
                <button
                  key={r.item.href}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go(r.item.href)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink hover:bg-surface transition-colors"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted" />
                  <span className="truncate">{r.item.label}</span>
                  <span className="ml-auto text-[11px] text-faint shrink-0">{r.section}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
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
      <header className="h-14 shrink-0 flex items-center gap-2 px-4 bg-brand-deep">
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

        {/* Section tabs. Each opens its first page; the rail then carries the
            rest of that section. */}
        <nav className="hidden lg:flex items-center gap-0.5 ml-4 min-w-0">
          {sections.map((section) => {
            const on = section.title === activeSection?.title;
            return (
              <Link
                key={section.title}
                href={section.items[0].href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[14px] whitespace-nowrap transition-colors",
                  on
                    ? "bg-white/[0.14] text-white"
                    : "text-white/70 hover:bg-white/[0.07] hover:text-white",
                )}
              >
                {section.title}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <PageSearch sections={sections} />

          {/* Project switcher */}
          {active && (
            <Dropdown>
              <DropdownTrigger className="hidden sm:flex items-center gap-2 rounded-md border border-white/15 bg-white/[0.08] px-2.5 py-1.5 text-sm text-white hover:bg-white/[0.14] transition-colors max-w-48">
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

          {/* Account — the avatar alone. The name and role live inside. */}
          <Dropdown>
            <DropdownTrigger
              className="grid h-9 w-9 place-items-center rounded-md hover:bg-white/10 transition-colors"
              aria-label="Account"
            >
              <Avatar name={profile.full_name} size={28} />
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
        </div>
      </header>

      {/* The workspace is a light panel inset on the dark ground, framed on the
          sides and foot. It holds its own height: the panel never scrolls, only
          the rail and the content within it do. */}
      <div className="flex-1 min-h-0 px-2 pb-2">
        <div className="h-full flex overflow-hidden rounded-[14px] bg-base">
          {showRail && activeSection && (
            <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border bg-elevated overflow-y-auto scrollbar-none">
              <nav className="flex-1 px-2.5 py-4">
                <ul className="space-y-0.5">
                  {activeSection.items.map((item) => (
                    <NavRow key={item.href} item={item} pathname={pathname} />
                  ))}
                </ul>
              </nav>
            </aside>
          )}

          <main className="flex-1 min-w-0 overflow-y-auto scrollbar-none px-3 md:px-4 py-3 md:py-4">
            {children}
          </main>
        </div>
      </div>

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
