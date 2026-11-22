"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Barre latérale shadcn/ui (variante « inset », repliable en icônes, tiroir sur mobile).
 *
 * Réécriture de la composition officielle SANS aucun style en ligne : la CSP du site
 * (`style-src 'self'`) bloque les attributs `style` rendus côté serveur. Les largeurs sont donc
 * portées par des classes et l'état par des attributs `data-*`. Le tiroir mobile n'utilise pas
 * de verrou de défilement injecté (balise <style>), également bloqué par la CSP.
 */

const COOKIE_KEY = "sentinel_sidebar_collapsed";
const DESKTOP_QUERY = "(min-width: 1024px)";

type SidebarContextValue = {
  collapsed: boolean;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  toggle: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebar(): SidebarContextValue {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar doit être utilisé dans <SidebarProvider>.");
  return ctx;
}

function SidebarProvider({ className, children, ...props }: React.ComponentProps<"div">) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- préférence lue une fois au montage
      if (localStorage.getItem(COOKIE_KEY) === "1") setCollapsed(true);
    } catch {
      /* stockage indisponible : barre dépliée */
    }
  }, []);

  // Échap ferme le tiroir mobile.
  React.useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const toggle = React.useCallback(() => {
    if (typeof window !== "undefined" && window.matchMedia(DESKTOP_QUERY).matches) {
      setCollapsed((c) => {
        try {
          localStorage.setItem(COOKIE_KEY, c ? "0" : "1");
        } catch {
          /* ignore */
        }
        return !c;
      });
    } else {
      setMobileOpen((o) => !o);
    }
  }, []);

  const value = React.useMemo(
    () => ({ collapsed, mobileOpen, setMobileOpen, toggle }),
    [collapsed, mobileOpen, toggle]
  );

  return (
    <SidebarContext.Provider value={value}>
      <TooltipProvider delayDuration={0}>
        <div
          data-slot="sidebar-wrapper"
          data-state={collapsed ? "collapsed" : "expanded"}
          className={cn("group/sidebar-wrapper flex min-h-svh w-full bg-sunken", className)}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

function Sidebar({ className, children, ...props }: React.ComponentProps<"aside">) {
  const { collapsed, mobileOpen, setMobileOpen } = useSidebar();
  return (
    <>
      {mobileOpen && (
        <div
          className="no-print fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        data-slot="sidebar"
        data-state={collapsed ? "collapsed" : "expanded"}
        data-collapsible={collapsed ? "icon" : ""}
        data-mobile-open={mobileOpen ? "true" : "false"}
        className={cn(
          "group peer no-print fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sunken text-fg transition-[width,transform] duration-200 ease-linear",
          mobileOpen ? "translate-x-0 shadow-lg" : "-translate-x-full",
          "lg:sticky lg:top-0 lg:h-svh lg:translate-x-0 lg:shadow-none",
          collapsed ? "lg:w-14" : "lg:w-64",
          className
        )}
        {...props}
      >
        {children}
      </aside>
    </>
  );
}

function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        "relative flex min-w-0 flex-1 flex-col bg-bg lg:m-2 lg:ml-0 lg:rounded-xl lg:border lg:border-border lg:shadow-xs",
        className
      )}
      {...props}
    />
  );
}

function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>) {
  const { toggle, collapsed, mobileOpen } = useSidebar();
  return (
    <Button
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon-sm"
      className={cn("-ml-1", className)}
      aria-label="Afficher ou masquer la barre latérale"
      aria-expanded={!collapsed || mobileOpen}
      onClick={(e) => {
        onClick?.(e);
        toggle();
      }}
      {...props}
    >
      <PanelLeft />
    </Button>
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-header" className={cn("flex flex-col gap-2 p-2", className)} {...props} />;
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-footer" className={cn("flex flex-col gap-2 p-2", className)} {...props} />;
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-auto lg:group-data-[collapsible=icon]:overflow-hidden",
        className
      )}
      {...props}
    />
  );
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-group" className={cn("relative flex w-full min-w-0 flex-col p-2", className)} {...props} />;
}

function SidebarGroupLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-label"
      className={cn(
        "flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-subtle transition-[margin,opacity] duration-200 ease-linear",
        "lg:group-data-[collapsible=icon]:-mt-8 lg:group-data-[collapsible=icon]:opacity-0",
        className
      )}
      {...props}
    />
  );
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul data-slot="sidebar-menu" className={cn("flex w-full min-w-0 flex-col gap-1", className)} {...props} />;
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="sidebar-menu-item" className={cn("group/menu-item relative", className)} {...props} />;
}

function SidebarMenuButton({
  asChild = false,
  isActive = false,
  tooltip,
  className,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean; isActive?: boolean; tooltip?: string }) {
  const { collapsed, setMobileOpen } = useSidebar();
  const Comp = asChild ? Slot : "button";
  const button = (
    <Comp
      data-slot="sidebar-menu-button"
      data-active={isActive}
      aria-current={isActive ? "page" : undefined}
      onClick={() => setMobileOpen(false)}
      className={cn(
        "flex h-8 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm text-muted outline-none transition-[width,height,padding,color,background-color] hover:bg-hover hover:text-fg focus-visible:ring-2 focus-visible:ring-brand/40",
        "data-[active=true]:bg-hover data-[active=true]:font-medium data-[active=true]:text-fg",
        "lg:group-data-[collapsible=icon]:size-8 lg:group-data-[collapsible=icon]:p-2",
        "[&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
        className
      )}
      {...props}
    />
  );
  if (!tooltip || !collapsed) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" align="center" className="hidden lg:block">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
};
