"use client";
/* eslint-disable @next/next/no-img-element -- petit logo local ; next/image impose un style en ligne que la CSP interdit */

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronsUpDown,
  Code2,
  CreditCard,
  Globe,
  LayoutDashboard,
  LogOut,
  Plug,
  ScanSearch,
  Activity,
  Crosshair,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import OrgSwitcher from "@/components/dashboard/OrgSwitcher";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Coque de la console, composée avec shadcn/ui : barre latérale « inset » (navigation groupée,
 * repliable en icônes, tiroir sur mobile) + en-tête (déclencheur, fil d'Ariane, organisation,
 * thème, menu utilisateur).
 */

type NavItem = { href: string; label: string; icon: LucideIcon };
const NAV: { title: string; items: NavItem[] }[] = [
  { title: "Pilotage", items: [{ href: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard }] },
  {
    title: "Analyse",
    items: [
      { href: "/dashboard/scan", label: "Scanner", icon: ScanSearch },
      { href: "/dashboard/pentest", label: "Pentest autonome", icon: Crosshair },
      { href: "/dashboard/monitoring", label: "Surveillance", icon: Activity },
      { href: "/dashboard/domaines", label: "Domaines", icon: Globe },
    ],
  },
  {
    title: "Automatisation",
    items: [
      { href: "/dashboard/cicd", label: "CI/CD", icon: Code2 },
      { href: "/dashboard/integrations", label: "Intégrations", icon: Plug },
    ],
  },
  {
    title: "Organisation",
    items: [
      { href: "/dashboard/team", label: "Équipe & audit", icon: Users },
      { href: "/dashboard/abonnement", label: "Abonnement", icon: CreditCard },
      { href: "/dashboard/account", label: "Mon compte", icon: UserRound },
    ],
  },
];
const ALL_ITEMS = NAV.flatMap((g) => g.items);

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
}

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

  // Charte « noir, gris et rouge carmin » : active dans l'espace connecté seulement (globals.css).
  useEffect(() => {
    document.documentElement.dataset.espace = "dashboard";
    return () => {
      delete document.documentElement.dataset.espace;
    };
  }, []);

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
    <SidebarProvider>
      <Sidebar aria-label="Navigation de la console" className="dark charte-sombre">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Vue d'ensemble" className="h-12 data-[active=true]:bg-transparent">
                <Link href="/dashboard">
                  <img
                    src="/logo-mark.png"
                    decoding="async"
                    alt=""
                    width={32}
                    height={32}
                    className="size-8 shrink-0 rounded-lg"
                  />
                  <span className="grid flex-1 text-left leading-tight">
                    <span className="truncate font-heading text-sm font-bold text-heading">Sentinel</span>
                    <span className="truncate text-xs text-subtle">
                      {planLabel ? `Offre ${planLabel}` : "Console"}
                    </span>
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        {/* Le bas de l'écran est occupé par les boutons flottants (accessibilité, cookies). */}
        <SidebarContent className="pb-44">
          {NAV.map((group) => (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive(pathname, item.href)} tooltip={item.label}>
                      <Link href={item.href}>
                        <item.icon aria-hidden="true" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <header className="no-print site-chrome sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4 lg:rounded-t-xl lg:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-1 !h-4" />
            <Breadcrumb className="min-w-0">
              <BreadcrumbList className="flex-nowrap">
                <BreadcrumbItem className="hidden sm:inline-flex">
                  <BreadcrumbLink asChild>
                    <Link href="/dashboard">Console</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {current && current.href !== "/dashboard" ? (
                  <>
                    <BreadcrumbSeparator className="hidden sm:block" />
                    <BreadcrumbItem className="min-w-0">
                      <BreadcrumbPage className="truncate">{current.label}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                ) : (
                  <>
                    <BreadcrumbSeparator className="hidden sm:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Vue d&apos;ensemble</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <OrgSwitcher />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex h-9 items-center gap-2 rounded-md pl-1 pr-2 outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                {/* Nom accessible = texte visible + rôle du menu (WCAG 2.5.3) ; initiales décoratives. */}
                <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-md bg-brand text-xs font-semibold text-white">
                  {initials || "?"}
                </span>
                <span className="hidden max-w-[10rem] truncate text-sm font-medium text-fg md:block">{display}</span>
                <span className="sr-only md:hidden">{display}</span>
                <span className="sr-only">, menu du compte</span>
                <ChevronsUpDown className="hidden size-4 text-muted sm:block" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="font-normal">
                  {user.name && <span className="block truncate text-sm font-medium text-fg">{user.name}</span>}
                  <span className="block truncate text-xs text-muted">{user.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/account">
                      <UserRound aria-hidden="true" /> Mon compte
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/abonnement">
                      <CreditCard aria-hidden="true" /> Abonnement
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={logout}>
                  <LogOut aria-hidden="true" /> Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {banner}
        <div id="contenu" tabIndex={-1} className="dash-shadcn min-w-0 flex-1 outline-none">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
