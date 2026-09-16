"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type ConsoleTab =
  | "scan"
  | "pentest"
  | "monitoring"
  | "cicd"
  | "integrations"
  | "team";

const TABS: { key: ConsoleTab; href: string; label: string }[] = [
  { key: "scan", href: "/dashboard", label: "Scanner" },
  { key: "pentest", href: "/dashboard/pentest", label: "Pentest autonome" },
  { key: "monitoring", href: "/dashboard/monitoring", label: "Surveillance" },
  { key: "cicd", href: "/dashboard/cicd", label: "CI/CD" },
  { key: "integrations", href: "/dashboard/integrations", label: "Intégrations" },
  { key: "team", href: "/dashboard/team", label: "Équipe" },
];

/** En-tête partagé des pages de la console, avec navigation responsive (menu mobile). */
export default function ConsoleHeader({ active }: { active: ConsoleTab }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const linkCls = (key: ConsoleTab) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      key === active ? "bg-hover text-fg" : "text-muted hover:text-fg"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-xl">
      <div className="container-x flex h-[64px] items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo-mark.png" alt="Sentinel by Kayzen" width={32} height={32} className="h-8 w-auto" />
            <span className="font-heading text-base font-semibold text-fg">
              Sentinel <span className="text-subtle">Console</span>
            </span>
          </Link>
          <nav className="hidden gap-1 lg:flex">
            {TABS.map((t) => (
              <Link key={t.key} href={t.href} className={linkCls(t.key)}>
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={logout} className="btn btn-ghost !px-3.5 !py-2 text-sm">
            Déconnexion
          </button>
          <button
            onClick={() => setOpen((o) => !o)}
            className="rounded-lg p-2 text-muted hover:bg-hover hover:text-fg lg:hidden"
            aria-label="Menu"
            aria-expanded={open}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d={open ? "M6 6l12 12M6 18L18 6" : "M4 7h16M4 12h16M4 17h16"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="container-x flex flex-col gap-1 border-t border-border py-3 lg:hidden">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={t.href}
              onClick={() => setOpen(false)}
              className={linkCls(t.key)}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
