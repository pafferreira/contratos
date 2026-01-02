import type { Route } from "next";
import type { LucideIcon } from "lucide-react";
import {
  FolderGit2,
  HandCoins,
  LayoutDashboard,
  Shield,
  Users,
  Waypoints,
  FileText,
  Clock,
  ShieldCheck
} from "lucide-react";

export type NavItem = {
  title: string;
  href: Route;
  icon: LucideIcon;
};

export const DASHBOARD_NAV: NavItem[] = [
  { title: "Visão Geral", href: "/dashboard", icon: LayoutDashboard },
  { title: "Contratos Cliente", href: "/contratos", icon: FileText },
  { title: "ESP & RS", href: "/rs", icon: Waypoints },
  { title: "Projetos", href: "/projetos", icon: FolderGit2 },
  { title: "Contratos Fornecedor", href: "/fornecedores", icon: HandCoins },
  { title: "Recursos ATE", href: "/recursos", icon: Users },
  { title: "Apontamento de Horas", href: "/apontamento", icon: Clock },

  { title: "Controle de Acesso", href: "/acesso", icon: ShieldCheck },
  { title: "Admin Acessos", href: "/acesso-admin", icon: Shield }
];
