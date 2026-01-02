"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LayoutDashboard, LogOut, PanelRightOpen, PanelRightClose } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { DASHBOARD_NAV } from "@/lib/constants/navigation";
import { Button } from "@/components/ui/button";
import { PersonaSwitcher } from "@/components/navigation/persona-switcher";
import { ThemeToggle } from "@/components/navigation/theme-toggle";
import { useSupabase } from "@/components/providers/supabase-provider";
import clsx from "clsx";
import pkg from "../../../package.json";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const { supabase } = useSupabase();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const isCollapsed = useMemo(() => collapsed && !mobileOpen, [collapsed, mobileOpen]);
  const [userLabel, setUserLabel] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      const email = data.user?.email ?? "";
      if (!email) {
        setUserLabel(null);
        return;
      }
      const { data: profile } = await supabase
        .from("z_usuarios")
        .select("nome_completo")
        .eq("email", email)
        .maybeSingle();
      const name = profile?.nome_completo || data.user?.user_metadata?.full_name || "Usuário";
      setUserLabel(`${name} · ${email}`);
    };

    loadUser();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-25">
      <aside
        className={clsx(
          "fixed inset-y-0 z-40 flex flex-col border-r border-neutral-100 bg-white transition-all duration-300 md:static md:translate-x-0",
          isCollapsed ? "w-16" : "w-55",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div
          className={clsx(
            "flex items-center justify-between px-4 py-6",
            isCollapsed ? "justify-center px-2" : ""
          )}
        >
          <div className="flex items-center gap-2 text-lg font-semibold text-neutral-700">
            <LayoutDashboard size={20} />
            <span className={clsx("truncate", isCollapsed && "hidden")}>Inventário de Contratos</span>
          </div>
        </div>
        <Tooltip.Provider delayDuration={150} disableHoverableContent>
          <nav className="flex-1 space-y-1 overflow-y-auto px-3">
            {DASHBOARD_NAV.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Tooltip.Root key={item.href} delayDuration={50}>
                  <Tooltip.Trigger asChild>
                    <Link
                      href={item.href}
                      className={clsx(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-brand-50 text-brand-700"
                          : "text-neutral-600 hocus:bg-neutral-100 hocus:text-neutral-900",
                        isCollapsed ? "justify-center" : ""
                      )}
                      onClick={() => setMobileOpen(false)}
                    >
                      <Icon
                        className={clsx("shrink-0", active ? "text-brand-700" : "text-neutral-500")}
                        size={18}
                      />
                      <span className={clsx("truncate", isCollapsed && "hidden")}>{item.title}</span>
                    </Link>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      side="right"
                      sideOffset={10}
                      className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white shadow-lg"
                    >
                      {item.title}
                      <Tooltip.Arrow className="fill-neutral-900" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              );
            })}
          </nav>
        </Tooltip.Provider>

        <div className={clsx("mt-auto border-t border-neutral-100 p-4", isCollapsed ? "px-2 py-4" : "p-4")}>
          <div className={clsx("flex items-center gap-2 text-neutral-400", isCollapsed && "justify-center")}>
            <div className="size-1.5 rounded-full bg-success/50" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              {isCollapsed ? `v${pkg.version.split(".")[0]}` : `v${pkg.version}`}
            </span>
          </div>
        </div>
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 border-b border-neutral-100 bg-white/70 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileOpen((prev) => !prev)}
                aria-label="Alternar menu"
              >
                <Menu size={20} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:inline-flex"
                onClick={() => setCollapsed((prev) => !prev)}
                aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
              >
                {isCollapsed ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
              </Button>
              <PersonaSwitcher />
              {userLabel ? (
                <div className="hidden text-xs font-medium text-neutral-500 md:block">
                  {userLabel}
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="icon" aria-label="Sair">
                <LogOut size={18} />
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
