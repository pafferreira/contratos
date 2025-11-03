"use client";

import { PageHeader } from "@/components/common/page-header";
import { Card } from "@/components/ui/card";
import { BarChart2, Clock3, FileText } from "lucide-react";

const KPI_CARDS = [
  {
    label: "Valor contratado (Cliente)",
    value: "R$ 12.450.000",
    helper: "+5% vs mês anterior",
    icon: FileText
  },
  {
    label: "Horas ATE consumidas",
    value: "1.820h",
    helper: "74% da reserva mensal",
    icon: Clock3
  },
  {
    label: "RS em homologação",
    value: "7",
    helper: "3 com risco de atraso",
    icon: BarChart2
  }
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel de Monitoramento"
        subtitle="Acompanhe o status consolidado de contratos, RS e recursos."
      />

      <section className="grid gap-4 md:grid-cols-3">
        {KPI_CARDS.map((card) => (
          <Card key={card.label}>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-sm font-medium text-neutral-500">
                  {card.label}
                </span>
                <p className="mt-2 text-2xl font-semibold text-neutral-800">
                  {card.value}
                </p>
                <p className="mt-2 text-xs uppercase tracking-wide text-brand-600">
                  {card.helper}
                </p>
              </div>
              <card.icon className="h-8 w-8 text-brand-500" />
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
