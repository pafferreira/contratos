"use client";

import { PageHeader } from "@/components/common/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Resource = {
  id: string;
  name: string;
  email: string;
  profile: string;
  supplier: string;
  allocation: string;
  hours: string;
};

const RESOURCES: Resource[] = [
  {
    id: "r-1",
    name: "Marina Azevedo",
    email: "marina.azevedo@tech.experts",
    profile: "Analista RPA Senior",
    supplier: "Tech Experts LTDA",
    allocation: "RS-24-031 · 100%",
    hours: "160h / mês"
  },
  {
    id: "r-2",
    name: "Daniel Freitas",
    email: "daniel.freitas@hiper.automation",
    profile: "Arquiteto de Soluções",
    supplier: "Hiperautomação Brasil",
    allocation: "RS-24-042 · 80%",
    hours: "128h / mês"
  }
];

export default function RecursosPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Recursos ATE"
        subtitle="Gerencie alocações, perfis e apontamento de horas."
        actions={<Button>Novo ATE</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {RESOURCES.map((resource) => (
          <Card key={resource.id} className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-neutral-800">{resource.name}</h2>
              <p className="text-sm text-neutral-500">{resource.email}</p>
            </div>
            <div className="grid gap-2 text-sm text-neutral-500">
              <p>
                <span className="font-medium text-neutral-700">Perfil:</span>{" "}
                {resource.profile}
              </p>
              <p>
                <span className="font-medium text-neutral-700">Fornecedor:</span>{" "}
                {resource.supplier}
              </p>
              <p>
                <span className="font-medium text-neutral-700">Alocação:</span>{" "}
                {resource.allocation}
              </p>
              <p>
                <span className="font-medium text-neutral-700">Horas previstas:</span>{" "}
                {resource.hours}
              </p>
            </div>
            <div className="flex items-center justify-end">
              <Button variant="outline" size="sm">
                Apontar horas
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
