"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import clsx from "clsx";

type RS = {
  id: string;
  code: string;
  spec: string;
  scope: string;
  status: "planejada" | "em_execucao" | "homologacao" | "encerrada";
  progress: number;
  plannedPeriod: string;
  leads: string;
};

const RS_LIST: RS[] = [
  {
    id: "rs-1",
    code: "RS-24-031",
    spec: "ESP-02 - Automação RPA",
    scope: "Implantação de fluxo hiperautomatizado para faturamento.",
    status: "em_execucao",
    progress: 62,
    plannedPeriod: "Mar - Jun/2024",
    leads: "Cliente: Ana Souza · BU: Carlos Lima"
  },
  {
    id: "rs-2",
    code: "RS-24-042",
    spec: "ESP-03 - Desenvolvimento",
    scope: "Portal de evidências e homologação.",
    status: "homologacao",
    progress: 88,
    plannedPeriod: "Fev - Mai/2024",
    leads: "Cliente: Bruno Reis · BU: Paula Nunes"
  }
];

const STATUS_LABEL: Record<RS["status"], string> = {
  planejada: "Planejada",
  em_execucao: "Em execução",
  homologacao: "Homologação",
  encerrada: "Encerrada"
};

export default function RSPage() {
  const statusClass = useMemo(
    () =>
      ({
        planejada: "bg-neutral-100 text-neutral-600",
        em_execucao: "bg-brand-50 text-brand-700",
        homologacao: "bg-warning/10 text-warning",
        encerrada: "bg-success/10 text-success"
      }) satisfies Record<RS["status"], string>,
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requisições de Serviço"
        subtitle="Acompanhe o andamento das RS e gerencie escopo, recursos e homologação."
        actions={<Button>Novo RS</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {RS_LIST.map((rs) => (
          <Card key={rs.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-400">
                  {rs.spec}
                </p>
                <h2 className="text-lg font-semibold text-neutral-800">{rs.code}</h2>
              </div>
              <span
                className={clsx(
                  "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                  statusClass[rs.status]
                )}
              >
                {STATUS_LABEL[rs.status]}
              </span>
            </div>
            <p className="mt-3 text-sm text-neutral-600">{rs.scope}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-neutral-500">
              <div>
                <dt className="uppercase tracking-wide">Período previsto</dt>
                <dd className="font-medium text-neutral-700">{rs.plannedPeriod}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-wide">% Concluído</dt>
                <dd className="font-medium text-neutral-700">{rs.progress}%</dd>
              </div>
              <div className="col-span-2">
                <dt className="uppercase tracking-wide">Responsáveis</dt>
                <dd className="font-medium text-neutral-700">{rs.leads}</dd>
              </div>
            </dl>
            <div className="mt-4">
              <div className="h-2 rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${rs.progress}%` }}
                  role="progressbar"
                  aria-valuenow={rs.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Progresso da ${rs.code}`}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
