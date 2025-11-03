"use client";

import { useState } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Contract = {
  id: string;
  contractNumber: string;
  clientName: string;
  totalValue: string;
  remainingValue: string;
  period: string;
};

const MOCK_CONTRACTS: Contract[] = [
  {
    id: "1",
    contractNumber: "CL-2024-001",
    clientName: "Cliente Alfa",
    totalValue: "R$ 4.500.000",
    remainingValue: "R$ 1.350.000",
    period: "01/01/2024 - 31/12/2024"
  },
  {
    id: "2",
    contractNumber: "CL-2024-014",
    clientName: "Cliente Beta",
    totalValue: "R$ 2.800.000",
    remainingValue: "R$ 950.000",
    period: "15/02/2024 - 15/02/2025"
  }
];

export default function ContratosPage() {
  const [contracts] = useState(MOCK_CONTRACTS);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contratos do Cliente"
        subtitle="Cadastre novos contratos e acompanhe saldos disponíveis."
        actions={<Button>Novo contrato</Button>}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {contracts.map((contract) => (
          <Card key={contract.id}>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-400">
                    Contrato
                  </p>
                  <p className="text-lg font-semibold text-neutral-800">
                    {contract.contractNumber}
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  Abrir
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-neutral-500">Cliente</p>
                  <p className="font-medium text-neutral-700">{contract.clientName}</p>
                </div>
                <div>
                  <p className="text-neutral-500">Período</p>
                  <p className="font-medium text-neutral-700">{contract.period}</p>
                </div>
                <div>
                  <p className="text-neutral-500">Valor total</p>
                  <p className="font-medium text-neutral-800">{contract.totalValue}</p>
                </div>
                <div>
                  <p className="text-neutral-500">Saldo disponível</p>
                  <p className="font-medium text-success">{contract.remainingValue}</p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
