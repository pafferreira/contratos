"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { format, parseISO } from "date-fns";
import clsx from "clsx";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";
import { CalendarDays, LayoutGrid, List, Pencil, Plus, RefreshCcw, Trash2, X } from "lucide-react";
import { z } from "zod";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { type Database, type TablesRow } from "@/lib/supabase/types";

type ContractRow = TablesRow<Database["public"]["Tables"]["C_CONTRATOS_CLIENTE"]>;
type ClientRow = TablesRow<Database["public"]["Tables"]["C_CLIENTES"]>;

type ContractRecord = ContractRow & {
  cliente?: Pick<ClientRow, "id" | "nome"> | null;
};

type ContractFormState = {
  cliente_id: string;
  numero_contrato: string;
  data_inicio: string;
  data_fim: string;
  valor_total: string;
  valor_total_display: string;
  valor_comprometido: string;
  valor_comprometido_display: string;
  status: string;
};

type FormErrors = Partial<Record<keyof ContractFormState, string>> & {
  general?: string;
};

const CONTRACTS_TABLE =
  (process.env.NEXT_PUBLIC_SUPABASE_CONTRACTS_TABLE ??
    "C_CONTRATOS_CLIENTE") as keyof Database["public"]["Tables"];
const CLIENTS_TABLE =
  (process.env.NEXT_PUBLIC_SUPABASE_CLIENTS_TABLE ??
    "C_CLIENTES") as keyof Database["public"]["Tables"];

const STATUS_OPTIONS = [
  { value: "rascunho", label: "Rascunho" },
  { value: "ativo", label: "Ativo" },
  { value: "encerrado", label: "Encerrado" }
] as const;

const statusStyles: Record<string, string> = {
  rascunho: "bg-neutral-100 text-neutral-600",
  ativo: "bg-success/10 text-success",
  encerrado: "bg-neutral-200 text-neutral-700"
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const EMPTY_FORM_STATE: ContractFormState = {
  cliente_id: "",
  numero_contrato: "",
  data_inicio: "",
  data_fim: "",
  valor_total: "",
  valor_total_display: "",
  valor_comprometido: "",
  valor_comprometido_display: "",
  status: "rascunho"
};

const ContractFormSchema = z
  .object({
    cliente_id: z.string().trim().min(1, "Selecione o cliente"),
    numero_contrato: z.string().trim().min(1, "Informe o número do contrato"),
    data_inicio: z.string().trim().min(1, "Informe a data inicial"),
    data_fim: z.string().trim().min(1, "Informe a data final"),
    valor_total: z
      .string()
      .trim()
      .min(1, "Informe o valor total")
      .transform(Number)
      .refine((value) => !Number.isNaN(value), "Valor total inválido")
      .refine((value) => value > 0, "O valor total deve ser maior que zero"),
    valor_comprometido: z
      .string()
      .trim()
      .transform((value) => (value === "" ? 0 : Number(value)))
      .refine((value) => !Number.isNaN(value), "Valor comprometido inválido")
      .refine((value) => value >= 0, "O valor comprometido não pode ser negativo"),
    status: z.string().trim().min(1, "Selecione um status")
  })
  .refine(
    (data) => {
      const start = new Date(data.data_inicio);
      const end = new Date(data.data_fim);
      return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start;
    },
    {
      message: "A data final deve ser posterior ou igual à data inicial",
      path: ["data_fim"]
    }
  )
  .refine(
    (data) => data.valor_comprometido <= data.valor_total,
    {
      message: "O valor comprometido não pode ser maior que o total",
      path: ["valor_comprometido"]
    }
  );

function formatCurrency(value?: number | null) {
  if (typeof value !== "number") {
    return "—";
  }
  return currencyFormatter.format(value);
}

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start || !end) return "Vigência não informada";
  try {
    return `${format(parseISO(start), "dd/MM/yyyy")} – ${format(parseISO(end), "dd/MM/yyyy")}`;
  } catch {
    return `${start} – ${end}`;
  }
}

function inputClassName(hasError?: boolean) {
  return clsx(
    "w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-1",
    hasError
      ? "border-danger bg-white"
      : "border-neutral-300 bg-neutral-50 hocus:border-brand-500 hocus:bg-white"
  );
}

function formatCurrencyDisplayFromNumber(value?: number | null) {
  return typeof value === "number"
    ? currencyFormatter.format(value).replace(/\u00A0/g, " ")
    : "";
}

function normalizeCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return { raw: "", display: "" };
  }
  const numeric = (Number(digits) / 100).toFixed(2);
  const display = currencyFormatter
    .format(Number(numeric))
    .replace(/\u00A0/g, " ");
  return { raw: numeric, display };
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
  const [formState, setFormState] = useState<ContractFormState>({ ...EMPTY_FORM_STATE });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [activeContractId, setActiveContractId] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingContract, setPendingContract] = useState<ContractRecord | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [searchTerm, setSearchTerm] = useState("");

  const clientsMap = useMemo(() => {
    const map = new Map<string, ClientRow>();
    clients.forEach((client) => {
      if (client.id) {
        map.set(client.id, client);
      }
    });
    return map;
  }, [clients]);

  const filteredContracts = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return contracts;
    return contracts.filter((contract) => {
      const clientName =
        contract.cliente?.nome ??
        clientsMap.get(contract.cliente_id ?? "")?.nome ??
        "";
      return (
        contract.numero_contrato.toLowerCase().includes(normalized) ||
        clientName.toLowerCase().includes(normalized)
      );
    });
  }, [contracts, searchTerm, clientsMap]);

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

      options?.silent ? setRefreshing(true) : setLoading(true);
      setError(null);

      const [
        { data: contractData, error: contractError },
        { data: clientData, error: clientError }
      ] = await Promise.all([
        supabase
          .from(CONTRACTS_TABLE)
          .select(
            "id, cliente_id, numero_contrato, data_inicio, data_fim, valor_total, valor_comprometido, valor_disponivel, status, cliente:C_CLIENTES (id, nome)"
          )
          .order("data_inicio", { ascending: false }),
        supabase.from(CLIENTS_TABLE).select("id, nome").order("nome")
      ]);

      if (contractError || clientError) {
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.error("Erro ao carregar contratos/clientes:", contractError, clientError);
        }
        setError(
          contractError?.message ??
            clientError?.message ??
            "Não foi possível carregar os contratos. Verifique se os nomes das tabelas coincidem com o Supabase."
        );
      } else {
        setContracts((contractData ?? []) as ContractRecord[]);
        setClients(clientData ?? []);
      }

      options?.silent ? setRefreshing(false) : setLoading(false);
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
      cliente_id: contract.cliente_id ?? "",
      numero_contrato: contract.numero_contrato ?? "",
      data_inicio: contract.data_inicio ?? "",
      data_fim: contract.data_fim ?? "",
      valor_total:
        typeof contract.valor_total === "number" ? contract.valor_total.toFixed(2) : "",
      valor_total_display: formatCurrencyDisplayFromNumber(contract.valor_total),
      valor_comprometido:
        typeof contract.valor_comprometido === "number"
          ? contract.valor_comprometido.toFixed(2)
          : "",
      valor_comprometido_display: formatCurrencyDisplayFromNumber(
        contract.valor_comprometido
      ),
      status: contract.status ?? "rascunho"
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const handleCurrencyInputChange = (
    field: "valor_total" | "valor_comprometido",
    displayValue: string
  ) => {
    const { raw, display } = normalizeCurrencyInput(displayValue);
    setFormState((prev) => {
      if (field === "valor_total") {
        return {
          ...prev,
          valor_total: raw,
          valor_total_display: display
        };
      }
      return {
        ...prev,
        valor_comprometido: raw,
        valor_comprometido_display: display
      };
    });
  };

  const handleFormChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    if (name === "valor_total" || name === "valor_comprometido") {
      handleCurrencyInputChange(name, value);
      return;
    }
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
        if (fieldError?.length) {
          formattedErrors[field] = fieldError[0];
        }
      });
      setFormErrors(formattedErrors);
      return;
    }

    if (!clientsMap.has(parsed.data.cliente_id)) {
      setFormErrors({
        cliente_id: "Cliente inválido. Recarregue a página para sincronizar a lista."
      });
      return;
    }

    setSubmitting(true);
    const supabasePayload = {
      cliente_id: parsed.data.cliente_id,
      numero_contrato: parsed.data.numero_contrato,
      data_inicio: parsed.data.data_inicio,
      data_fim: parsed.data.data_fim,
      valor_total: parsed.data.valor_total,
      valor_comprometido: parsed.data.valor_comprometido,
      status: parsed.data.status
    };

    const mutation =
      formMode === "create"
        ? supabase.from(CONTRACTS_TABLE).insert(supabasePayload)
        : supabase
            .from(CONTRACTS_TABLE)
            .update(supabasePayload)
            .eq("id", activeContractId ?? "");

    const { error: mutationError } = await mutation;

    if (mutationError) {
      setFormErrors({
        general: mutationError.message ?? "Não foi possível salvar o contrato."
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
      .from(CONTRACTS_TABLE)
      .delete()
      .eq("id", pendingContract.id);

    if (deleteErr) {
      setDeleteError(deleteErr.message ?? "Não foi possível excluir o contrato.");
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

  const supabaseUnavailable = supabase === null;
  const clientSelectDisabled = clients.length === 0;
  const isCreateMode = formMode === "create";
  const submitDisabled = submitting || (clientSelectDisabled && isCreateMode);

  const getStatusLabel = (value?: string | null) => {
    if (!value) return "Sem status";
    return STATUS_OPTIONS.find((item) => item.value === value)?.label ?? value;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contratos do Cliente"
        subtitle="Inventário oficial de contratos. Os nomes seguem a convenção do Supabase."
        actions={
          <>
            <Button
              variant="outline"
              size="md"
              onClick={handleRefresh}
              disabled={loading || refreshing}
            >
              <RefreshCcw className="mr-2 size-4" />
              {refreshing ? "Atualizando..." : "Atualizar"}
            </Button>
            <Button onClick={openCreateForm} disabled={supabaseUnavailable}>
              <Plus className="mr-2 size-4" />
              Novo contrato
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="w-full md:max-w-md">
          <label className="text-sm font-medium text-neutral-600">
            Buscar por número ou cliente
          </label>
          <input
            type="text"
            placeholder="Ex.: CLT-2024-01 ou ACME Corp"
            className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:border-brand-500 focus:outline-none"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-neutral-600">Visualização</span>
          <div className="flex rounded-lg border border-neutral-200 bg-white p-1">
            <Button
              type="button"
              size="icon"
              variant={viewMode === "cards" ? "default" : "ghost"}
              onClick={() => setViewMode("cards")}
              aria-pressed={viewMode === "cards"}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant={viewMode === "list" ? "default" : "ghost"}
              onClick={() => setViewMode("list")}
              aria-pressed={viewMode === "list"}
            >
              <List className="size-4" />
            </Button>
          </div>
        </div>
      </div>

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
              <Plus className="mr-2 size-4" />
              Cadastrar primeiro contrato
            </Button>
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-center text-sm text-neutral-500">
            <p>Nenhum contrato encontrado para o filtro informado.</p>
            {searchTerm ? (
              <Button variant="secondary" size="sm" onClick={() => setSearchTerm("")}>
                Limpar busca
              </Button>
            ) : null}
          </div>
        ) : viewMode === "cards" ? (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredContracts.map((contract) => (
              <Card key={`${contract.id}-card`} className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-neutral-500">Contrato</p>
                    <h3 className="text-lg font-semibold text-neutral-900">
                      {contract.numero_contrato}
                    </h3>
                    <p className="text-xs text-neutral-500">{contract.id}</p>
                  </div>
                  <Tooltip.Provider delayDuration={150}>
                    <div className="flex flex-col gap-2">
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditForm(contract)}
                            aria-label={`Editar contrato ${contract.numero_contrato}`}
                            disabled={supabaseUnavailable}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content
                            side="top"
                            sideOffset={6}
                            className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-neutral-900 shadow-lg"
                          >
                            Editar contrato
                            <Tooltip.Arrow className="fill-white" />
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-danger"
                            onClick={() => openDeleteDialog(contract)}
                            aria-label={`Excluir contrato ${contract.numero_contrato}`}
                            disabled={supabaseUnavailable}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content
                            side="top"
                            sideOffset={6}
                            className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-neutral-900 shadow-lg"
                          >
                            Excluir contrato
                            <Tooltip.Arrow className="fill-white" />
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                    </div>
                  </Tooltip.Provider>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-neutral-500">Cliente</dt>
                    <dd className="font-medium text-neutral-900">
                      {contract.cliente?.nome ??
                        clientsMap.get(contract.cliente_id ?? "")?.nome ??
                        "Cliente não encontrado"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Vigência</dt>
                    <dd className="font-medium text-neutral-900">
                      {formatDateRange(contract.data_inicio, contract.data_fim)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Valor total</dt>
                    <dd className="font-medium text-neutral-900">
                      {formatCurrency(contract.valor_total)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Comprometido</dt>
                    <dd className="font-medium text-neutral-900">
                      {formatCurrency(contract.valor_comprometido)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Saldo disponível</dt>
                    <dd className="font-semibold text-success">
                      {formatCurrency(contract.valor_disponivel)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Status</dt>
                    <dd>
                      <span
                        className={clsx(
                          "inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize",
                          statusStyles[contract.status ?? ""] ??
                            "bg-neutral-100 text-neutral-600"
                        )}
                      >
                        {getStatusLabel(contract.status)}
                      </span>
                    </dd>
                  </div>
                </dl>
              </Card>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-100 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <th className="px-3 py-3">Contrato</th>
                  <th className="px-3 py-3">Cliente</th>
                  <th className="px-3 py-3">Vigência</th>
                  <th className="px-3 py-3">Valor total</th>
                  <th className="px-3 py-3">Comprometido</th>
                  <th className="px-3 py-3">Saldo disponível</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-700">
                {filteredContracts.map((contract) => (
                  <tr key={contract.id}>
                    <td className="px-3 py-4">
                      <div className="font-semibold text-neutral-900">
                        {contract.numero_contrato}
                      </div>
                      <p className="text-xs text-neutral-500">{contract.id}</p>
                    </td>
                    <td className="px-3 py-4">
                      {contract.cliente?.nome ??
                        clientsMap.get(contract.cliente_id ?? "")?.nome ??
                        "Cliente não encontrado"}
                    </td>
                    <td className="px-3 py-4">
                      {formatDateRange(contract.data_inicio, contract.data_fim)}
                    </td>
                    <td className="px-3 py-4 font-medium text-neutral-900">
                      {formatCurrency(contract.valor_total)}
                    </td>
                    <td className="px-3 py-4 text-neutral-800">
                      {formatCurrency(contract.valor_comprometido)}
                    </td>
                    <td className="px-3 py-4 font-semibold text-success">
                      {formatCurrency(contract.valor_disponivel)}
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
                      <Tooltip.Provider delayDuration={150}>
                        <div className="flex flex-col items-end gap-1">
                          <Tooltip.Root>
                            <Tooltip.Trigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditForm(contract)}
                                aria-label={`Editar contrato ${contract.numero_contrato}`}
                                disabled={supabaseUnavailable}
                              >
                                <Pencil className="size-4" />
                              </Button>
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                              <Tooltip.Content
                                side="top"
                                sideOffset={6}
                                className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-neutral-900 shadow-lg"
                              >
                                Editar contrato
                                <Tooltip.Arrow className="fill-white" />
                              </Tooltip.Content>
                            </Tooltip.Portal>
                          </Tooltip.Root>
                          <Tooltip.Root>
                            <Tooltip.Trigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-danger"
                                onClick={() => openDeleteDialog(contract)}
                                aria-label={`Excluir contrato ${contract.numero_contrato}`}
                                disabled={supabaseUnavailable}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                              <Tooltip.Content
                                side="top"
                                sideOffset={6}
                                className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-neutral-900 shadow-lg"
                              >
                                Excluir contrato
                                <Tooltip.Arrow className="fill-white" />
                              </Tooltip.Content>
                            </Tooltip.Portal>
                          </Tooltip.Root>
                        </div>
                      </Tooltip.Provider>
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
          <Dialog.Overlay className="fixed inset-0 z-40 bg-neutral-900/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(560px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-100 bg-white p-6 shadow-card">
            <div className="flex items-start justify-between">
              <Dialog.Title className="text-lg font-semibold text-neutral-900">
                {formMode === "create" ? "Novo contrato" : "Editar contrato"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Fechar formulário">
                    <X className="size-4" />
                </Button>
              </Dialog.Close>
            </div>
            {/* <Dialog.Description className="mt-1 text-sm text-neutral-500">
              Os campos utilizam os mesmos nomes do Supabase (ex.: C_CONTRATOS_CLIENTE).
            </Dialog.Description> */}

            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              {formErrors.general ? (
                <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                  {formErrors.general}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="cliente_id" className="text-sm font-medium text-neutral-700">
                    Cliente
                  </label>
                  <select
                    id="cliente_id"
                    name="cliente_id"
                    value={formState.cliente_id}
                    onChange={handleFormChange}
                    className={inputClassName(Boolean(formErrors.cliente_id))}
                    disabled={clientSelectDisabled}
                  >
                    <option value="">
                      {clientSelectDisabled ? "Cadastre clientes primeiro" : "Selecione o cliente"}
                    </option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.nome}
                      </option>
                    ))}
                  </select>
                  {formErrors.cliente_id ? (
                    <p className="text-xs text-danger">{formErrors.cliente_id}</p>
                  ) : (
                    <p className="text-xs text-neutral-500">
                      Fonte: tabela de CLIENTES cadastrados.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="numero_contrato"
                    className="text-sm font-medium text-neutral-700"
                  >
                    Número do contrato
                  </label>
                  <input
                    id="numero_contrato"
                    name="numero_contrato"
                    value={formState.numero_contrato}
                    onChange={handleFormChange}
                    className={inputClassName(Boolean(formErrors.numero_contrato))}
                    placeholder="CL-2024-001"
                  />
                  {formErrors.numero_contrato ? (
                    <p className="text-xs text-danger">{formErrors.numero_contrato}</p>
                  ) : (
                    <p className="text-xs text-neutral-500">
                      Numero do Contrato registrado
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="data_inicio" className="text-sm font-medium text-neutral-700">
                    Início da vigência
                  </label>
                  <div className="relative">
                    <input
                      id="data_inicio"
                      type="date"
                      name="data_inicio"
                      value={formState.data_inicio}
                      onChange={handleFormChange}
                      className={clsx(inputClassName(Boolean(formErrors.data_inicio)), "pr-10")}
                    />
                    <CalendarDays className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                  </div>
                  {formErrors.data_inicio ? (
                    <p className="text-xs text-danger">{formErrors.data_inicio}</p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="data_fim" className="text-sm font-medium text-neutral-700">
                    Fim da vigência
                  </label>
                  <div className="relative">
                    <input
                      id="data_fim"
                      type="date"
                      name="data_fim"
                      value={formState.data_fim}
                      onChange={handleFormChange}
                      className={clsx(inputClassName(Boolean(formErrors.data_fim)), "pr-10")}
                    />
                    <CalendarDays className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                  </div>
                  {formErrors.data_fim ? (
                    <p className="text-xs text-danger">{formErrors.data_fim}</p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="valor_total" className="text-sm font-medium text-neutral-700">
                    Valor total (R$)
                  </label>
                  <input
                    id="valor_total"
                    type="text"
                    inputMode="numeric"
                    name="valor_total"
                    value={formState.valor_total_display}
                    onChange={handleFormChange}
                    className={inputClassName(Boolean(formErrors.valor_total))}
                    placeholder="R$ 0,00"
                  />
                  {formErrors.valor_total ? (
                    <p className="text-xs text-danger">{formErrors.valor_total}</p>
                  ) : (
                    <p className="text-xs text-neutral-500">
                      Campo usado na geração automática do saldo.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="valor_comprometido"
                    className="text-sm font-medium text-neutral-700"
                  >
                    Valor comprometido (R$)
                  </label>
                  <input
                    id="valor_comprometido"
                    type="text"
                    inputMode="numeric"
                    name="valor_comprometido"
                    value={formState.valor_comprometido_display}
                    onChange={handleFormChange}
                    className={inputClassName(Boolean(formErrors.valor_comprometido))}
                    placeholder="R$ 0,00"
                  />
                  {formErrors.valor_comprometido ? (
                    <p className="text-xs text-danger">{formErrors.valor_comprometido}</p>
                  ) : (
                    <p className="text-xs text-neutral-500">
                      Cálculo do Vl Disponível = Vl Total - Vl Comprometido
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
                    className={inputClassName(Boolean(formErrors.status))}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                  {formErrors.status ? (
                    <p className="text-xs text-danger">{formErrors.status}</p>
                  ) : (
                    <p className="text-xs text-neutral-500">
                      Valores: rascunho, ativo ou encerrado.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-neutral-100 bg-neutral-25 px-3 py-2 text-xs text-neutral-600">
                O campo <strong>valor_disponivel</strong> é calculado automaticamente pelo Sistema.
                Atualize o valor comprometido sempre que lançar novas ESP/RS.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Dialog.Close asChild>
                  <Button type="button" variant="ghost">
                    Cancelar
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={submitDisabled}>
                  {submitting
                    ? isCreateMode
                      ? "Salvando..."
                      : "Atualizando..."
                    : isCreateMode
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
          <Dialog.Overlay className="fixed inset-0 z-40 bg-neutral-900/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(420px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-100 bg-white p-6 shadow-card">
            <div className="flex items-start justify-between">
              <Dialog.Title className="text-lg font-semibold text-neutral-900">
                Excluir contrato
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Fechar confirmação">
                <X className="size-4" />
                </Button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="mt-1 text-sm text-neutral-500">
              Confirma a exclusão do contrato {" "}
              <span className="font-semibold text-neutral-800">
                {pendingContract?.numero_contrato}
              </span>{" "} ?  
               Essa ação não pode ser desfeita.
              
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
