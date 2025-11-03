"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LayoutDashboard, LogOut } from "lucide-react";
import { useState } from "react";
import { DASHBOARD_NAV } from "@/lib/constants/navigation";
import { Button } from "@/components/ui/button";
import { PersonaSwitcher } from "@/components/navigation/persona-switcher";
import { ThemeToggle } from "@/components/navigation/theme-toggle";
import clsx from "clsx";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-neutral-25">
      <aside
        className={clsx(
          "fixed inset-y-0 z-40 w-72 border-r border-neutral-100 bg-white px-4 py-6 transition-transform md:static md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex items-center gap-2 px-2 text-lg font-semibold text-neutral-700">
          <LayoutDashboard size={20} />
          <span>Inventário de Contratos</span>
        </div>
        <nav className="mt-6 space-y-1">
          {DASHBOARD_NAV.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-neutral-600 hocus:bg-neutral-100 hocus:text-neutral-900"
                )}
                onClick={() => setMobileOpen(false)}
              >
                <span>{item.title}</span>
                <span className="text-xs uppercase tracking-wide text-neutral-400">
                  {item.icon}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-neutral-100 bg-white/70 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileOpen((prev) => !prev)}
                aria-label="Alternar menu"
              >
                <Menu size={20} />
              </Button>
              <PersonaSwitcher />
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="icon" aria-label="Sair">
                <LogOut size={18} />
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
