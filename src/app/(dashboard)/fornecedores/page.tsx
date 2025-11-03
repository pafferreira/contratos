"use client";

import { PageHeader } from "@/components/common/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Supplier = {
  id: string;
  name: string;
  contractNumber: string;
  totalValue: string;
  remaining: string;
  activeOS: number;
};

const SUPPLIERS: Supplier[] = [
  {
    id: "s-1",
    name: "Tech Experts LTDA",
    contractNumber: "FORN-2024-08",
    totalValue: "R$ 3.200.000",
    remaining: "R$ 960.000",
    activeOS: 5
  },
  {
    id: "s-2",
    name: "Hiperautomação Brasil",
    contractNumber: "FORN-2023-12",
    totalValue: "R$ 4.100.000",
    remaining: "R$ 1.240.000",
    activeOS: 7
  }
];

export default function FornecedoresPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Contratos de Fornecedor"
        subtitle="Controle contratos, OS e consumo de horas dos recursos ATE."
        actions={<Button>Novo contrato fornecedor</Button>}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {SUPPLIERS.map((supplier) => (
          <Card key={supplier.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-400">
                  Contrato
                </p>
                <h2 className="text-lg font-semibold text-neutral-800">
                  {supplier.contractNumber}
                </h2>
              </div>
              <Button variant="ghost" size="sm">
                Visualizar OS
              </Button>
            </div>
            <p className="text-sm text-neutral-600">{supplier.name}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-neutral-500">Valor total</p>
                <p className="font-medium text-neutral-800">{supplier.totalValue}</p>
              </div>
              <div>
                <p className="text-neutral-500">Saldo reservado</p>
                <p className="font-medium text-success">{supplier.remaining}</p>
              </div>
              <div>
                <p className="text-neutral-500">OS ativas</p>
                <p className="font-medium text-neutral-700">{supplier.activeOS}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
