"use client";
/* eslint-disable @next/next/no-img-element -- petit logo local ; next/image impose un style en ligne que la CSP interdit */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "@/components/ui/ThemeToggle";
import OrgSwitcher from "@/components/dashboard/OrgSwitcher";

/**
 * Coque de la console : barre latérale (navigation groupée, repliable, tiroir sur mobile)
 * + barre du haut (fil d'Ariane, organisation, thème, menu utilisateur).
 */

type IconName =
  | "home"
  | "scan"
  | "target"
  | "pulse"
  | "globe"
  | "code"
  | "plug"
  | "users"
  | "card"
  | "user";

const ICONS: Record<IconName, string> = {
  home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  scan: "M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M4 12h16",
  target: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8zM12 12h.01",
  pulse: "M3 12h4l2-6 4 12 2-6h6",
  globe: "M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.500 5.600 12 3z",
  code: "M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16",
  plug: "M9 3v5M15 3v5M6 8h12v3a6 6 0 01-12 0V8zM12 17v4",
  users: "M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.500 10a3.500 3.500 0 100-7 3.500 3.500 0 000 7zM21 19v-1a4 4 0 00-3-3.870M15.500 3.200a3.500 3.500 0 010 6.600",
  card: "M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zM3 10h18M7 15h3",
  user: "M19 20v-1a5 5 0 00-5-5h-4a5 5 0 00-5 5v1M12 11a4 4 0 100-8 4 4 0 000 8z",
};

function Icon({ name, className = "h-[18px] w-[18px]" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={`flex-none ${className}`} aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

type NavItem = { href: string; label: string; icon: IconName };
const NAV: { title: string; items: NavItem[] }[] = [
  { title: "Pilotage", items: [{ href: "/dashboard", label: "Vue d'ensemble", icon: "home" }] },
  {
    title: "Analyse",
    items: [
      { href: "/dashboard/scan", label: "Scanner", icon: "scan" },
      { href: "/dashboard/pentest", label: "Pentest autonome", icon: "target" },
      { href: "/dashboard/monitoring", label: "Surveillance", icon: "pulse" },
      { href: "/dashboard/domaines", label: "Domaines", icon: "globe" },
    ],
  },
  {
    title: "Automatisation",
    items: [
      { href: "/dashboard/cicd", label: "CI/CD", icon: "code" },
      { href: "/dashboard/integrations", label: "Intégrations", icon: "plug" },
    ],
  },
  {
    title: "Organisation",
    items: [
      { href: "/dashboard/team", label: "Équipe & audit", icon: "users" },
      { href: "/dashboard/abonnement", label: "Abonnement", icon: "card" },
      { href: "/dashboard/account", label: "Mon compte", icon: "user" },
    ],
  },
];
const ALL_ITEMS = NAV.flatMap((g) => g.items);

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
}

const COLLAPSE_KEY = "sentinel_sidebar_collapsed";

export default function DashboardShell({
  user,
  planLabel,
  banner,
  children,
}: {
  user: { email: string; name: string | null };
  planLabel: string | null;
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/dashboard";
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- préférence lue une fois au montage
      if (localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsed(true);
    } catch {
      /* stockage indisponible : barre dépliée */
    }
  }, []);

  // Échap ferme le tiroir mobile et le menu utilisateur ; clic extérieur ferme le menu.
  useEffect(() => {
    if (!drawer && !menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawer(false);
        setMenu(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (menu && menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [drawer, menu]);

  function toggleCollapsed() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !c;
    });
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const current = [...ALL_ITEMS].reverse().find((i) => isActive(pathname, i.href));
  const display = user.name || user.email;
  const initials = display
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex min-h-screen bg-sunken">
      {drawer && (
        <div className="no-print fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setDrawer(false)} aria-hidden="true" />
      )}

      <aside
        aria-label="Navigation de la console"
        className={`no-print fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          collapsed ? "lg:w-[68px]" : "lg:w-60"
        } w-64 ${drawer ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-16 flex-none items-center justify-between border-b border-border px-4">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5" title="Vue d'ensemble">
            <img src="/logo-mark.png" decoding="async" alt="" width={30} height={30} className="w-[30px] flex-none" />
            <span className={`font-heading text-base font-bold text-heading ${collapsed ? "lg:hidden" : ""}`}>
              Sentinel
            </span>
          </Link>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-fg lg:inline-flex"
            aria-label={collapsed ? "Déplier la barre latérale" : "Replier la barre latérale"}
            aria-expanded={!collapsed}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d={collapsed ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setDrawer(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-fg lg:hidden"
            aria-label="Fermer le menu"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* En haut de la barre : le bas est occupé par les boutons flottants (accessibilité, cookies). */}
        {planLabel && (
          <Link
            href="/dashboard/abonnement"
            className={`mx-2.5 mt-3 flex-none rounded-lg border border-border bg-sunken px-3 py-2.5 text-xs transition-colors hover:border-border-strong ${
              collapsed ? "lg:hidden" : ""
            }`}
          >
            <span className="block text-subtle">Offre actuelle</span>
            <span className="mt-0.5 block font-heading text-sm font-semibold text-fg">{planLabel}</span>
          </Link>
        )}
        <nav className="flex-1 overflow-y-auto px-2.5 pb-44 pt-4">
          {NAV.map((group) => (
            <div key={group.title} className="mb-5 last:mb-0">
              <p
                className={`mb-1.5 px-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-subtle ${
                  collapsed ? "lg:sr-only" : ""
                }`}
              >
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setDrawer(false)}
                        aria-current={active ? "page" : undefined}
                        title={collapsed ? item.label : undefined}
                        className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors duration-150 ${
                          collapsed ? "lg:justify-center" : ""
                        } ${
                          active
                            ? "bg-brand/10 text-brand"
                            : "text-muted hover:bg-hover hover:text-fg"
                        }`}
                      >
                        <Icon name={item.icon} />
                        <span className={`truncate ${collapsed ? "lg:sr-only" : ""}`}>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print site-chrome sticky top-0 z-30 flex h-16 flex-none items-center justify-between gap-3 border-b border-border px-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawer(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-fg lg:hidden"
              aria-label="Ouvrir le menu"
              aria-expanded={drawer}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </button>
            <nav aria-label="Fil d'Ariane" className="min-w-0">
              <ol className="flex items-center gap-2 text-sm">
                <li className="hidden sm:block">
                  <Link href="/dashboard" className="text-muted hover:text-fg">Console</Link>
                </li>
                {current && current.href !== "/dashboard" && (
                  <>
                    <li className="hidden text-subtle sm:block" aria-hidden="true">/</li>
                    <li className="truncate font-medium text-fg" aria-current="page">{current.label}</li>
                  </>
                )}
              </ol>
            </nav>
          </div>

          <div className="flex flex-none items-center gap-1.5">
            <OrgSwitcher />
            <ThemeToggle />
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenu((m) => !m)}
                className="flex h-10 items-center gap-2 rounded-full pl-1 pr-2 hover:bg-hover"
                aria-label="Menu utilisateur"
                aria-haspopup="menu"
                aria-expanded={menu}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                  {initials || "?"}
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="hidden text-muted sm:block" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {menu && (
                <div role="menu" aria-label="Menu utilisateur" className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-lg)]">
                  <div className="border-b border-border px-4 py-3">
                    {user.name && <p className="truncate text-sm font-semibold text-fg">{user.name}</p>}
                    <p className="truncate text-xs text-muted">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <Link href="/dashboard/account" role="menuitem" onClick={() => setMenu(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-fg hover:bg-hover">
                      <Icon name="user" className="h-4 w-4 text-muted" /> Mon compte
                    </Link>
                    <Link href="/dashboard/abonnement" role="menuitem" onClick={() => setMenu(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-fg hover:bg-hover">
                      <Icon name="card" className="h-4 w-4 text-muted" /> Abonnement
                    </Link>
                  </div>
                  <div className="border-t border-border py-1">
                    <button type="button" role="menuitem" onClick={logout} className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-risk hover:bg-risk/10">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 16l4-4-4-4M14 12H4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {banner}
        <div id="contenu" tabIndex={-1} className="min-w-0 flex-1 outline-none">
          {children}
        </div>
      </div>
    </div>
  );
}
