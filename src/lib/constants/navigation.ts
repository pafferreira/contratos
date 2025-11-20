import type { Route } from "next";

export type NavItem = {
  title: string;
  href: Route;
  icon?: string;
};

export const DASHBOARD_NAV: NavItem[] = [
  { title: "Visão Geral", href: "/dashboard" },
  { title: "Contratos Cliente", href: "/contratos" },
  { title: "ESP & RS", href: "/rs" },
  { title: "Projetos", href: "/projetos" },
  { title: "Contratos Fornecedor", href: "/fornecedores" },
  { title: "Recursos ATE", href: "/recursos" }
];
