"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { format, parseISO } from "date-fns";
import clsx from "clsx";
import * as Dialog from "@radix-ui/react-dialog";
import { Pencil, Plus, RefreshCcw, Trash2, X } from "lucide-react";
import { z } from "zod";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { type Database, type TablesRow } from "@/lib/supabase/types";

type ContractRow = TablesRow<Database["public"]["Tables"]["P_client_contracts"]>;
type ClientRow = TablesRow<Database["public"]["Tables"]["P_clients"]>;

type ContractRecord = ContractRow & {
  client?: Pick<ClientRow, "id" | "name"> | null;
};

type ContractFormState = {
  contract_number: string;
  client_id: string;
  start_date: string;
  end_date: string;
  total_value: string;
  committed_value: string;
  remaining_value: string;
  status: string;
};

type FormErrors = Partial<Record<keyof ContractFormState, string>> & {
  general?: string;
};

const CONTRACT_STATUS = [
  { value: "vigente", label: "Vigente" },
  { value: "em_homologacao", label: "Em homologação" },
  { value: "encerrado", label: "Encerrado" },
  { value: "suspenso", label: "Suspenso" }
] as const;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const EMPTY_FORM_STATE: ContractFormState = {
  contract_number: "",
  client_id: "",
  start_date: "",
  end_date: "",
  total_value: "",
  committed_value: "",
  remaining_value: "",
  status: "vigente"
};

const ContractFormSchema = z
  .object({
    contract_number: z.string().trim().min(1, "Informe o número do contrato"),
    client_id: z.string().trim().min(1, "Selecione um cliente"),
    start_date: z.string().trim().min(1, "Informe a data inicial"),
    end_date: z.string().trim().min(1, "Informe a data final"),
    total_value: z
      .string()
      .trim()
      .min(1, "Informe o valor total")
      .transform((value) => Number(value))
      .refine((value) => !Number.isNaN(value), "Valor total inválido")
      .refine((value) => value > 0, "O valor total deve ser maior que zero"),
    committed_value: z
      .string()
      .trim()
      .transform((value) => (value === "" ? 0 : Number(value)))
      .refine((value) => !Number.isNaN(value), "Valor comprometido inválido")
      .refine((value) => value >= 0, "O valor comprometido não pode ser negativo"),
    remaining_value: z
      .string()
      .trim()
      .transform((value) => (value === "" ? 0 : Number(value)))
      .refine((value) => !Number.isNaN(value), "Saldo inválido")
      .refine((value) => value >= 0, "O saldo não pode ser negativo"),
    status: z.string().trim().min(1, "Selecione um status")
  })
  .refine(
    (data) => {
      const start = new Date(data.start_date);
      const end = new Date(data.end_date);
      return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start;
    },
    {
      message: "A data final deve ser posterior ou igual à data inicial",
      path: ["end_date"]
    }
  )
  .refine(
    (data) => data.remaining_value <= data.total_value,
    {
      message: "O saldo não pode ser maior que o valor total",
      path: ["remaining_value"]
    }
  );

const statusStyles: Record<string, string> = {
  vigente: "bg-success/10 text-success",
  em_homologacao: "bg-warning/10 text-warning",
  encerrado: "bg-neutral-100 text-neutral-700",
  suspenso: "bg-danger/10 text-danger"
};

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start || !end) {
    return "Período não informado";
  }
  try {
    const startLabel = format(parseISO(start), "dd/MM/yyyy");
    const endLabel = format(parseISO(end), "dd/MM/yyyy");
    return `${startLabel} – ${endLabel}`;
  } catch {
    return `${start} – ${end}`;
  }
}

function formatCurrency(value?: number | null) {
  if (typeof value !== "number") {
    return "—";
  }
  return currencyFormatter.format(value);
}

export default function ContratosPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formState, setFormState] = useState<ContractFormState>(() => ({
    ...EMPTY_FORM_STATE
  }));
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [activeContractId, setActiveContractId] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingContract, setPendingContract] = useState<ContractRecord | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadContracts = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!supabase) {
        setError(
          "Supabase não configurado. Informe NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY."
        );
        setContracts([]);
        setClients([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (options?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const [
        { data: contractData, error: contractError },
        { data: clientData, error: clientError }
      ] = await Promise.all([
        supabase
          .from("P_client_contracts")
          .select(
            "id, client_id, contract_number, start_date, end_date, total_value, committed_value, remaining_value, status, client:P_clients (id, name)"
          )
          .order("start_date", { ascending: false }),
        supabase.from("P_clients").select("id, name").order("name")
      ]);

      if (contractError || clientError) {
        setError("Não foi possível carregar os contratos. Tente novamente.");
      } else {
        setContracts((contractData ?? []) as ContractRecord[]);
        setClients(clientData ?? []);
      }

      if (options?.silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    void loadContracts();
  }, [loadContracts]);

  const resetFormState = () => {
    setFormState({ ...EMPTY_FORM_STATE });
    setFormErrors({});
    setActiveContractId(null);
    setFormMode("create");
  };

  const handleFormDialogChange = (open: boolean) => {
    if (!open) {
      setFormOpen(false);
      resetFormState();
      setSubmitting(false);
    } else {
      setFormOpen(true);
    }
  };

  const openCreateForm = () => {
    resetFormState();
    setFormMode("create");
    setFormOpen(true);
  };

  const openEditForm = (contract: ContractRecord) => {
    setFormMode("edit");
    setActiveContractId(contract.id);
    setFormState({
      contract_number: contract.contract_number ?? "",
      client_id: contract.client?.id ?? contract.client_id ?? "",
      start_date: contract.start_date ?? "",
      end_date: contract.end_date ?? "",
      total_value:
        contract.total_value !== null && contract.total_value !== undefined
          ? String(contract.total_value)
          : "",
      committed_value:
        contract.committed_value !== null && contract.committed_value !== undefined
          ? String(contract.committed_value)
          : "",
      remaining_value:
        contract.remaining_value !== null && contract.remaining_value !== undefined
          ? String(contract.remaining_value)
          : "",
      status: contract.status ?? "vigente"
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const handleFormChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormErrors({});

    if (!supabase) {
      setFormErrors({
        general: "Supabase não configurado. Atualize as variáveis de ambiente."
      });
      return;
    }

    const parsed = ContractFormSchema.safeParse(formState);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const formattedErrors: FormErrors = {};
      (Object.keys(fieldErrors) as (keyof ContractFormState)[]).forEach((field) => {
        const fieldError = fieldErrors[field];
        if (fieldError && fieldError.length > 0) {
          formattedErrors[field] = fieldError[0] ?? "";
        }
      });
      setFormErrors(formattedErrors);
      return;
    }

    setSubmitting(true);

    const payload = parsed.data;
    const supabasePayload = {
      contract_number: payload.contract_number,
      client_id: payload.client_id,
      start_date: payload.start_date,
      end_date: payload.end_date,
      total_value: payload.total_value,
      committed_value: payload.committed_value,
      remaining_value: payload.remaining_value,
      status: payload.status
    };

    const mutation =
      formMode === "create"
        ? supabase.from("P_client_contracts").insert(supabasePayload)
        : supabase
            .from("P_client_contracts")
            .update(supabasePayload)
            .eq("id", activeContractId ?? "");

    const { error: mutationError } = await mutation;

    if (mutationError) {
      setFormErrors({
        general: "Não foi possível salvar o contrato. Tente novamente."
      });
      setSubmitting(false);
      return;
    }

    await loadContracts({ silent: true });
    resetFormState();
    setSubmitting(false);
    setFormOpen(false);
  };

  const handleDeleteDialogChange = (open: boolean) => {
    if (!open) {
      setDeleteOpen(false);
      setPendingContract(null);
      setDeleteError(null);
      setDeleteLoading(false);
    } else {
      setDeleteOpen(true);
    }
  };

  const openDeleteDialog = (contract: ContractRecord) => {
    setPendingContract(contract);
    setDeleteError(null);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!pendingContract) return;

    if (!supabase) {
      setDeleteError("Supabase não configurado. Atualize as variáveis de ambiente.");
      return;
    }

    setDeleteLoading(true);
    const { error: deleteErr } = await supabase
      .from("P_client_contracts")
      .delete()
      .eq("id", pendingContract.id);

    if (deleteErr) {
      setDeleteError("Não foi possível excluir o contrato. Tente novamente.");
      setDeleteLoading(false);
      return;
    }

    await loadContracts({ silent: true });
    setDeleteLoading(false);
    setDeleteError(null);
    setDeleteOpen(false);
    setPendingContract(null);
  };

  const handleRefresh = () => {
    void loadContracts({ silent: true });
  };

  const getStatusLabel = (value?: string | null) => {
    if (!value) return "Sem status";
    const found = CONTRACT_STATUS.find((status) => status.value === value);
    return found ? found.label : value;
  };

  const supabaseUnavailable = supabase === null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contratos do Cliente"
        subtitle="Cadastre, consulte, edite e exclua contratos com saldos atualizados."
        actions={
          <>
            <Button
              variant="outline"
              size="md"
              onClick={handleRefresh}
              disabled={loading || refreshing}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              {refreshing ? "Atualizando..." : "Atualizar"}
            </Button>
            <Button onClick={openCreateForm} disabled={supabaseUnavailable}>
              <Plus className="mr-2 h-4 w-4" />
              Novo contrato
            </Button>
          </>
        }
      />

      <Card>
        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-neutral-500">
            Carregando contratos...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 text-center text-sm text-neutral-600">
            <p>{error}</p>
            <Button variant="outline" onClick={() => loadContracts()}>
              Tentar novamente
            </Button>
          </div>
        ) : contracts.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-center text-sm text-neutral-500">
            <p>Nenhum contrato cadastrado ainda.</p>
            <Button onClick={openCreateForm} disabled={supabaseUnavailable}>
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar primeiro contrato
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-100 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <th className="px-3 py-3">Contrato</th>
                  <th className="px-3 py-3">Cliente</th>
                  <th className="px-3 py-3">Período</th>
                  <th className="px-3 py-3">Valor total</th>
                  <th className="px-3 py-3">Saldo</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-700">
                {contracts.map((contract) => (
                  <tr key={contract.id}>
                    <td className="px-3 py-4">
                      <div className="font-semibold text-neutral-900">
                        {contract.contract_number}
                      </div>
                      <p className="text-xs text-neutral-500">{contract.id}</p>
                    </td>
                    <td className="px-3 py-4">
                      {contract.client?.name ?? "Cliente não informado"}
                    </td>
                    <td className="px-3 py-4">
                      {formatDateRange(contract.start_date, contract.end_date)}
                    </td>
                    <td className="px-3 py-4">
                      <div className="font-medium text-neutral-900">
                        {formatCurrency(contract.total_value)}
                      </div>
                      <p className="text-xs text-neutral-500">
                        Comprometido: {formatCurrency(contract.committed_value)}
                      </p>
                    </td>
                    <td className="px-3 py-4 font-medium text-success">
                      {formatCurrency(contract.remaining_value)}
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={clsx(
                          "inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize",
                          statusStyles[contract.status ?? ""] ?? "bg-neutral-100 text-neutral-600"
                        )}
                      >
                        {getStatusLabel(contract.status)}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditForm(contract)}
                          aria-label={`Editar contrato ${contract.contract_number}`}
                          disabled={supabaseUnavailable}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger"
                          onClick={() => openDeleteDialog(contract)}
                          aria-label={`Excluir contrato ${contract.contract_number}`}
                          disabled={supabaseUnavailable}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog.Root open={formOpen} onOpenChange={handleFormDialogChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-neutral-900/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(520px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-100 bg-white p-6 shadow-card">
            <div className="flex items-start justify-between">
              <Dialog.Title className="text-lg font-semibold text-neutral-900">
                {formMode === "create" ? "Novo contrato" : "Editar contrato"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Fechar formulário">
                  <X className="h-4 w-4" />
                </Button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="mt-1 text-sm text-neutral-500">
              Preencha os dados do contrato para manter o inventário atualizado.
            </Dialog.Description>

            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              {formErrors.general ? (
                <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                  {formErrors.general}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="contract_number"
                    className="text-sm font-medium text-neutral-700"
                  >
                    Número do contrato
                  </label>
                  <input
                    id="contract_number"
                    name="contract_number"
                    value={formState.contract_number}
                    onChange={handleFormChange}
                    className={clsx(
                      "w-full rounded-lg border px-3 py-2 text-sm outline-none hocus:border-brand-500",
                      formErrors.contract_number ? "border-danger" : "border-neutral-200"
                    )}
                    placeholder="CL-2024-001"
                  />
                  {formErrors.contract_number ? (
                    <p className="text-xs text-danger">{formErrors.contract_number}</p>
                  ) : (
                    <p className="text-xs text-neutral-500">
                      Use um identificador único definido com o cliente.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="client_id" className="text-sm font-medium text-neutral-700">
                    Cliente
                  </label>
                  <select
                    id="client_id"
                    name="client_id"
                    value={formState.client_id}
                    onChange={handleFormChange}
                    className={clsx(
                      "w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none hocus:border-brand-500",
                      formErrors.client_id ? "border-danger" : "border-neutral-200"
                    )}
                  >
                    <option value="">Selecione o cliente</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.client_id ? (
                    <p className="text-xs text-danger">{formErrors.client_id}</p>
                  ) : (
                    <p className="text-xs text-neutral-500">
                      Os clientes são sincronizados automaticamente a partir do cadastro geral.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="start_date" className="text-sm font-medium text-neutral-700">
                    Início da vigência
                  </label>
                  <input
                    id="start_date"
                    type="date"
                    name="start_date"
                    value={formState.start_date}
                    onChange={handleFormChange}
                    className={clsx(
                      "w-full rounded-lg border px-3 py-2 text-sm outline-none hocus:border-brand-500",
                      formErrors.start_date ? "border-danger" : "border-neutral-200"
                    )}
                  />
                  {formErrors.start_date ? (
                    <p className="text-xs text-danger">{formErrors.start_date}</p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="end_date" className="text-sm font-medium text-neutral-700">
                    Fim da vigência
                  </label>
                  <input
                    id="end_date"
                    type="date"
                    name="end_date"
                    value={formState.end_date}
                    onChange={handleFormChange}
                    className={clsx(
                      "w-full rounded-lg border px-3 py-2 text-sm outline-none hocus:border-brand-500",
                      formErrors.end_date ? "border-danger" : "border-neutral-200"
                    )}
                  />
                  {formErrors.end_date ? (
                    <p className="text-xs text-danger">{formErrors.end_date}</p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="total_value" className="text-sm font-medium text-neutral-700">
                    Valor total (R$)
                  </label>
                  <input
                    id="total_value"
                    type="number"
                    step="0.01"
                    name="total_value"
                    value={formState.total_value}
                    onChange={handleFormChange}
                    className={clsx(
                      "w-full rounded-lg border px-3 py-2 text-sm outline-none hocus:border-brand-500",
                      formErrors.total_value ? "border-danger" : "border-neutral-200"
                    )}
                  />
                  {formErrors.total_value ? (
                    <p className="text-xs text-danger">{formErrors.total_value}</p>
                  ) : (
                    <p className="text-xs text-neutral-500">
                      Inclua o valor global contratado com o cliente.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="committed_value"
                    className="text-sm font-medium text-neutral-700"
                  >
                    Valor comprometido (R$)
                  </label>
                  <input
                    id="committed_value"
                    type="number"
                    step="0.01"
                    name="committed_value"
                    value={formState.committed_value}
                    onChange={handleFormChange}
                    className={clsx(
                      "w-full rounded-lg border px-3 py-2 text-sm outline-none hocus:border-brand-500",
                      formErrors.committed_value ? "border-danger" : "border-neutral-200"
                    )}
                  />
                  {formErrors.committed_value ? (
                    <p className="text-xs text-danger">{formErrors.committed_value}</p>
                  ) : (
                    <p className="text-xs text-neutral-500">
                      Soma das ESP/RS comprometidas neste contrato.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="remaining_value"
                    className="text-sm font-medium text-neutral-700"
                  >
                    Saldo disponível (R$)
                  </label>
                  <input
                    id="remaining_value"
                    type="number"
                    step="0.01"
                    name="remaining_value"
                    value={formState.remaining_value}
                    onChange={handleFormChange}
                    className={clsx(
                      "w-full rounded-lg border px-3 py-2 text-sm outline-none hocus:border-brand-500",
                      formErrors.remaining_value ? "border-danger" : "border-neutral-200"
                    )}
                  />
                  {formErrors.remaining_value ? (
                    <p className="text-xs text-danger">{formErrors.remaining_value}</p>
                  ) : (
                    <p className="text-xs text-neutral-500">
                      Informe o saldo atual após compromissos aprovados.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="status" className="text-sm font-medium text-neutral-700">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formState.status}
                    onChange={handleFormChange}
                    className={clsx(
                      "w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none hocus:border-brand-500",
                      formErrors.status ? "border-danger" : "border-neutral-200"
                    )}
                  >
                    {CONTRACT_STATUS.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                  {formErrors.status ? (
                    <p className="text-xs text-danger">{formErrors.status}</p>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Dialog.Close asChild>
                  <Button type="button" variant="ghost">
                    Cancelar
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? formMode === "create"
                      ? "Salvando..."
                      : "Atualizando..."
                    : formMode === "create"
                      ? "Salvar contrato"
                      : "Atualizar contrato"}
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={deleteOpen} onOpenChange={handleDeleteDialogChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-neutral-900/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(420px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-100 bg-white p-6 shadow-card">
            <div className="flex items-start justify-between">
              <Dialog.Title className="text-lg font-semibold text-neutral-900">
                Excluir contrato
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Fechar confirmação">
                  <X className="h-4 w-4" />
                </Button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="mt-1 text-sm text-neutral-500">
              Esta ação é irreversível. O contrato{" "}
              <span className="font-semibold text-neutral-800">
                {pendingContract?.contract_number}
              </span>{" "}
              será removido do inventário.
            </Dialog.Description>

            {deleteError ? (
              <div className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                {deleteError}
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-end gap-3">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost">
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteLoading || !pendingContract}
              >
                {deleteLoading ? "Excluindo..." : "Excluir"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
