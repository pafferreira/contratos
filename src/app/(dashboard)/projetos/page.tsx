"use client";

import { PageHeader } from "@/components/common/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Projeto = {
  id: string;
  title: string;
  rsCode: string;
  scope: string;
  progress: number;
  dates: string;
  evidences: number;
};

const PROJECTS: Projeto[] = [
  {
    id: "p-1",
    title: "Portal de Homologação",
    rsCode: "RS-24-042",
    scope: "Construção do portal de evidências com fluxos de aprovação.",
    progress: 88,
    dates: "Previsto: Fev - Mai/2024 · Real: Fev - Jun/2024",
    evidences: 12
  },
  {
    id: "p-2",
    title: "RPA Faturamento",
    rsCode: "RS-24-031",
    scope: "Automação hiperautomatizada de faturamento multicanal.",
    progress: 62,
    dates: "Previsto: Mar - Jun/2024 · Real: Mar - Atual",
    evidences: 8
  }
];

export default function ProjetosPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Projetos"
        subtitle="Detalhe escopo, recursos e evidências por projeto."
        actions={<Button>Nova associação de RS</Button>}
      />

      <div className="space-y-4">
        {PROJECTS.map((project) => (
          <Card key={project.id} className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="md:w-2/3">
              <p className="text-xs uppercase tracking-wide text-neutral-400">
                {project.rsCode}
              </p>
              <h2 className="text-xl font-semibold text-neutral-800">{project.title}</h2>
              <p className="mt-2 text-sm text-neutral-600">{project.scope}</p>
              <p className="mt-2 text-xs uppercase tracking-wide text-neutral-400">
                {project.dates}
              </p>
            </div>
            <div className="md:w-1/3">
              <div className="flex items-center justify-between text-sm text-neutral-500">
                <span>% Concluído</span>
                <span className="font-medium text-neutral-700">{project.progress}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
              <p className="mt-3 text-xs uppercase tracking-wide text-neutral-400">
                Evidências carregadas
              </p>
              <p className="text-lg font-semibold text-neutral-800">
                {project.evidences} itens
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
