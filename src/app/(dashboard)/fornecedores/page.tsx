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

type SupplierContractRow = TablesRow<Database["public"]["Tables"]["C_CONTRATOS_FORNECEDOR"]>;

type SupplierRow = TablesRow<Database["public"]["Tables"]["C_FORNECEDORES"]>;

type SupplierContractRecord = SupplierContractRow & {

  fornecedor?: Pick<SupplierRow, "id" | "nome"> | null;

};

type ContractFormState = {

  fornecedor_id: string;

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

const CONTRACTS_TABLE = (

  process.env.NEXT_PUBLIC_SUPABASE_SUPPLIER_CONTRACTS_TABLE ?? "C_CONTRATOS_FORNECEDOR"

) as keyof Database["public"]["Tables"];

const SUPPLIERS_TABLE = (

  process.env.NEXT_PUBLIC_SUPABASE_SUPPLIERS_TABLE ?? "C_FORNECEDORES"

) as keyof Database["public"]["Tables"];

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

  fornecedor_id: "",

  numero_contrato: "",

  data_inicio: "",

  data_fim: "",

  valor_total: "",

  valor_total_display: "",

  valor_comprometido: "",

  valor_comprometido_display: "",
  status: "rascunho",

};

const ContractFormSchema = z

  .object({

    fornecedor_id: z.string().trim().min(1, "Selecione o fornecedor"),

    numero_contrato: z.string().trim().min(1, "Informe o número do contrato"),

    data_inicio: z.string().trim().min(1, "Informe a data inicial"),

    data_fim: z.string().trim().min(1, "Informe a data final"),

    valor_total: z

      .string()

      .trim()

      .min(1, "Informe o valor total")

      .transform(Number)

      .refine((value) => !Number.isNaN(value), "Valor total invÃ¡lido")

      .refine((value) => value > 0, "O valor total deve ser maior que zero"),

    valor_comprometido: z

      .string()

      .trim()

      .transform((value) => (value === "" ? 0 : Number(value)))

      .refine((value) => !Number.isNaN(value), "Valor comprometido invÃ¡lido")

      .refine((value) => value >= 0, "O valor comprometido nÃ£o pode ser negativo"),

    status: z.string().trim().min(1, "Selecione um status"),
  })

  .refine(

    (data) => {

      const start = new Date(data.data_inicio);

      const end = new Date(data.data_fim);

      return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start;

    },

    {

      message: "A data final deve ser posterior ou igual Ã  data inicial",

      path: ["data_fim"]

    }

  )

  .refine(

    (data) => data.valor_comprometido <= data.valor_total,

    {

      message: "O valor comprometido nÃ£o pode ser maior que o total",

      path: ["valor_comprometido"]

    }

  );

function formatCurrency(value?: number | null) {

  if (typeof value !== "number") {

    return "até";

  }

  return currencyFormatter.format(value);

}

function formatDateRange(start?: string | null, end?: string | null) {

  if (!start || !end) return "Perí­odo não informado";

  try {

    return `${format(parseISO(start), "dd/MM/yyyy")} até ${format(parseISO(end), "dd/MM/yyyy")}`;

  } catch {

    return `${start} até ${end}`;

  }

}

function inputClassName(hasError?: boolean) {

  return clsx(

    "w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-1",

    hasError

      ? "border-danger bg-white"

      : "border-neutral-300 bg-neutral-50 hover:border-brand-500 hover:bg-white"

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

  const display = currencyFormatter.format(Number(numeric)).replace(/\u00A0/g, " ");

  return { raw: numeric, display };

}

export default function ContratosFornecedorPage() {

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [contracts, setContracts] = useState<SupplierContractRecord[]>([]);

  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);

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

  const [pendingContract, setPendingContract] = useState<SupplierContractRecord | null>(null);

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [deleteLoading, setDeleteLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");

  const suppliersMap = useMemo(() => {

    const map = new Map<string, SupplierRow>();

    suppliers.forEach((supplier) => {

      if (supplier.id) {

        map.set(supplier.id, supplier);

      }

    });

    return map;

  }, [suppliers]);

  const loadSuppliers = useCallback(async () => {

    const { data, error: fetchError } = await supabase

      .from(SUPPLIERS_TABLE)

      .select("id, nome")

      .order("nome", { ascending: true });

    if (fetchError) {

      setError("Erro ao carregar fornecedores.");

      return [];

    }

    const rows = (data || []) as SupplierRow[];

    setSuppliers(rows);

    return rows;

  }, [supabase]);

  const loadContracts = useCallback(

    async (options?: { silent?: boolean }) => {

      if (!options?.silent) {

        setLoading(true);

      }

      const { data, error: fetchError } = await supabase

        .from(CONTRACTS_TABLE)

        .select("*, fornecedor:C_FORNECEDORES(id, nome)")

        .order("data_inicio", { ascending: false });

      if (fetchError) {

        setError("Erro ao carregar contratos de fornecedor.");

        setContracts([]);

        setLoading(false);

        setRefreshing(false);

        return;

      }

      setContracts((data || []) as SupplierContractRecord[]);

      setLoading(false);

      setRefreshing(false);

    },

    [supabase]

  );

  useEffect(() => {

    void loadSuppliers();

    void loadContracts();

  }, [loadContracts, loadSuppliers]);

  const filteredContracts = useMemo(() => {

    const normalized = searchTerm.trim().toLowerCase();

    if (!normalized) return contracts;

    return contracts.filter((contract) => {

      return (

        contract.numero_contrato.toLowerCase().includes(normalized) ||

        contract.fornecedor?.nome?.toLowerCase().includes(normalized)

      );

    });

  }, [contracts, searchTerm]);

  const handleRefresh = async () => {

    setRefreshing(true);

    await Promise.all([loadSuppliers(), loadContracts({ silent: true })]);

    setRefreshing(false);

  };

  const resetForm = useCallback(() => {

    setFormState({ ...EMPTY_FORM_STATE });

    setFormErrors({});

    setActiveContractId(null);

  }, []);

  const handleFormDialogChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setFormOpen(false);
        resetForm();
        setSubmitting(false);
      } else {
        setFormOpen(true);
      }
    },
    [resetForm]
  );

  const openCreateForm = () => {

    resetForm();

    setFormMode("create");

    setFormOpen(true);

  };

  const openEditForm = (contract: SupplierContractRecord) => {

    setFormMode("edit");

    setActiveContractId(contract.id ?? null);

    setFormState({

      fornecedor_id: contract.fornecedor_id ?? "",

      numero_contrato: contract.numero_contrato ?? "",

      data_inicio: contract.data_inicio ?? "",

      data_fim: contract.data_fim ?? "",

      valor_total: contract.valor_total?.toString() ?? "",

      valor_total_display: formatCurrencyDisplayFromNumber(contract.valor_total),

      valor_comprometido: contract.valor_comprometido?.toString() ?? "",

      valor_comprometido_display: formatCurrencyDisplayFromNumber(contract.valor_comprometido),

      valor_comprometido_display: formatCurrencyDisplayFromNumber(contract.valor_comprometido),

      status: contract.status ?? "rascunho",

    });

    setFormErrors({});

    setFormOpen(true);

  };

  const handleInputChange = (

    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>

  ) => {

    const { name, value } = event.target;

    setFormState((prev) => ({ ...prev, [name]: value }));

  };

  const handleCurrencyChange = (

    event: ChangeEvent<HTMLInputElement>,

    field: "valor_total" | "valor_comprometido"

  ) => {

    const { value } = event.target;

    const { raw, display } = normalizeCurrencyInput(value);

    setFormState((prev) => ({

      ...prev,

      [field]: raw,

      [`${field}_display`]: display

    }));

  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {

    event.preventDefault();

    setFormErrors({});

    const parsed = ContractFormSchema.safeParse(formState);

    if (!parsed.success) {

      const fieldErrors = parsed.error.flatten().fieldErrors;

      const formattedErrors: FormErrors = {};

      (Object.keys(fieldErrors) as (keyof typeof fieldErrors)[]).forEach((key) => {

        const [message] = fieldErrors[key] ?? [];

        if (message) {

          formattedErrors[key as keyof ContractFormState] = message;

        }

      });

      setFormErrors(formattedErrors);

      return;

    }

    if (!suppliersMap.has(parsed.data.fornecedor_id)) {

      setFormErrors({ fornecedor_id: "Selecione um fornecedor vÃ¡lido" });

      return;

    }

    const payload = {

      fornecedor_id: parsed.data.fornecedor_id,

      numero_contrato: parsed.data.numero_contrato,

      data_inicio: parsed.data.data_inicio,

      data_fim: parsed.data.data_fim,

      valor_total: parsed.data.valor_total,

      valor_comprometido: parsed.data.valor_comprometido,

      status: parsed.data.status,

    };

    setSubmitting(true);

    setError(null);

    const query = supabase.from(CONTRACTS_TABLE);

    const response = formMode === "edit" && activeContractId

      ? await query.update(payload).eq("id", activeContractId)

      : await query.insert(payload);

    setSubmitting(false);

    if (response.error) {

      setFormErrors({

        general: response.error.message || "Erro ao salvar o contrato. Verifique os dados e tente novamente.",

      });

      return;

    }

    setFormOpen(false);

    resetForm();

    await loadContracts();

  };

  const handleDelete = async () => {

    if (!pendingContract?.id) return;

    setDeleteLoading(true);

    setDeleteError(null);

    const { error: deleteErr } = await supabase

      .from(CONTRACTS_TABLE)

      .delete()

      .eq("id", pendingContract.id);

    setDeleteLoading(false);

    if (deleteErr) {

      setDeleteError("Erro ao excluir o contrato.");

      return;

    }

    setDeleteOpen(false);

    setPendingContract(null);

    await loadContracts();

  };

  const isCreateMode = formMode === "create";

  const supplierSelectDisabled = suppliers.length === 0;

  const submitDisabled = submitting || (supplierSelectDisabled && isCreateMode);

  return (

    <div className="space-y-6">

      <PageHeader

        title="Contratos de Fornecedor"

        subtitle="Gerencie contratos, vigências e valores negociados com fornecedores."

        actions={

          <Button onClick={openCreateForm}>

            <Plus className="mr-2 size-4" />

            Novo contrato fornecedor

          </Button>

        }

      />

      {error ? (

        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">

          {error}

        </div>

      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">

        <div className="w-full md:max-w-md">

          <label className="text-sm font-medium text-neutral-600">

            Buscar por número ou fornecedor

          </label>

          <input

            type="text"

            placeholder="Ex.: FORN-2024-08 ou Tech Experts"

            className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:border-brand-500 focus:outline-none"

            value={searchTerm}

            onChange={(event) => setSearchTerm(event.target.value)}

          />

        </div>

        <div className="flex flex-col gap-2">

          <span className="text-sm font-medium text-neutral-600">Visualização</span>

          <div className="flex items-center gap-2">

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

            <Button

              variant="secondary"

              size="sm"

              onClick={handleRefresh}

              disabled={refreshing}

              type="button"

            >

              <RefreshCcw className={clsx("mr-2 size-4", refreshing && "animate-spin")}

 />

              Atualizar

            </Button>

          </div>

        </div>

      </div>

      {loading ? (

        <Card>

          <p className="text-sm text-neutral-500">Carregando contratos...</p>

        </Card>

      ) : filteredContracts.length === 0 ? (

        <Card>

          <p className="text-sm text-neutral-500">

            Nenhum contrato encontrado para o filtro informado.

          </p>

        </Card>

      ) : viewMode === "cards" ? (

        <div className="grid gap-4 xl:grid-cols-2">

          {filteredContracts.map((contract) => (

            <Card key={contract.id} className="space-y-4">

              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">

                <div>

                  <p className="text-xs uppercase tracking-wide text-neutral-400">

                    Contrato

                  </p>

                  <div className="flex items-center gap-2">

                    <h2 className="text-xl font-semibold text-neutral-900">

                      {contract.numero_contrato}

                    </h2>

                    <span

                      className={clsx(

                        "rounded-full px-2 py-0.5 text-xs font-medium",

                        statusStyles[contract.status ?? "rascunho"] ?? "bg-neutral-100 text-neutral-600"

                      )}

                    >

                      {STATUS_OPTIONS.find((option) => option.value === contract.status)?.label ??

                        "Sem status"}

                    </span>

                  </div>

                  <p className="text-sm text-neutral-600">

                    {contract.fornecedor?.nome ?? "Fornecedor não informado"}

                  </p>

                </div>

                <Tooltip.Provider delayDuration={150}>

                  <div className="flex items-center gap-2">

                    <Tooltip.Root>

                      <Tooltip.Trigger asChild>

                        <Button

                          variant="secondary"

                          size="sm"

                          onClick={() => openEditForm(contract)}

                        >

                          <Pencil className="mr-2 size-4" />

                          Editar

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

                          onClick={() => {

                            setPendingContract(contract);

                            setDeleteOpen(true);

                            setDeleteError(null);

                          }}

                          aria-label="Excluir contrato"

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

              <div className="grid gap-3 text-sm text-neutral-600 md:grid-cols-2">

                <div>

                  <p className="text-neutral-500">Valor total</p>

                  <p className="font-medium text-neutral-900">

                    {formatCurrency(contract.valor_total)}

                  </p>

                </div>

                <div>

                  <p className="text-neutral-500">Valor comprometido</p>

                  <p className="font-medium text-neutral-900">

                    {formatCurrency(contract.valor_comprometido)}

                  </p>

                </div>

                <div>

                  <p className="text-neutral-500">Saldo disponível</p>

                  <p className="font-medium text-success">

                    {formatCurrency(contract.valor_disponivel)}

                  </p>

                </div>

                <div className="flex items-center gap-2 text-neutral-700">

                  <p className="text-neutral-500">Vigência</p>

                  <CalendarDays className="size-4 text-neutral-400" />

                  <span>{formatDateRange(contract.data_inicio, contract.data_fim)}</span>

                </div>

              </div>

            </Card>

          ))}

        </div>

      ) : (

        <Card className="overflow-hidden">

          <div className="overflow-x-auto">

            <table className="min-w-full divide-y divide-neutral-200 text-sm">

              <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">

                <tr>

                  <th className="px-4 py-3">Contrato</th>

                  <th className="px-4 py-3">Valores</th>

                  <th className="px-4 py-3">Vigência</th>

                  <th className="px-4 py-3">Status</th>

                  <th className="px-4 py-3 text-right">Ações</th>

                </tr>

              </thead>

              <tbody className="divide-y divide-neutral-100 text-neutral-700">

                {filteredContracts.map((contract) => {

                  const statusLabel =

                    STATUS_OPTIONS.find((option) => option.value === contract.status)?.label ??

                    "Sem status";

                  return (

                    <tr key={`${contract.id}-list`}>

                      <td className="px-4 py-3">

                        <p className="font-semibold text-neutral-900">

                          {contract.numero_contrato}

                        </p>

                        <p className="text-xs text-neutral-500">

                          {contract.fornecedor?.nome ?? "Fornecedor não informado"}

                        </p>

                      </td>

                      <td className="px-4 py-3">

                        <p className="font-semibold text-neutral-900">

                          {formatCurrency(contract.valor_total)}

                        </p>

                        <p className="text-xs text-neutral-500">

                          Comprometido: {formatCurrency(contract.valor_comprometido)}

                        </p>

                      </td>

                      <td className="px-4 py-3">

                        {formatDateRange(contract.data_inicio, contract.data_fim)}

                      </td>

                      <td className="px-4 py-3">

                        <span

                          className={clsx(

                            "rounded-full px-2 py-0.5 text-xs font-medium",

                            statusStyles[contract.status ?? "rascunho"] ??

                              "bg-neutral-100 text-neutral-600"

                          )}

                        >

                          {statusLabel}

                        </span>

                      </td>

                      <td className="px-4 py-3 text-right">

                        <Tooltip.Provider delayDuration={150}>

                          <div className="flex items-center justify-end gap-2">

                            <Tooltip.Root>

                              <Tooltip.Trigger asChild>

                                <Button

                                  variant="secondary"

                                  size="sm"

                                  onClick={() => openEditForm(contract)}

                                  type="button"

                                >

                                  <Pencil className="mr-2 size-4" />

                                  Editar

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

                                  type="button"

                                  onClick={() => {

                                    setPendingContract(contract);

                                    setDeleteOpen(true);

                                    setDeleteError(null);

                                  }}

                                  aria-label="Excluir contrato"

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

                  );

                })}

              </tbody>

            </table>

          </div>

        </Card>

      )}
      <Dialog.Root open={formOpen} onOpenChange={handleFormDialogChange}>

        <Dialog.Portal>

          <Dialog.Overlay className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm" />

          <Dialog.Content

            className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4"
          >

            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">

              <div className="mb-4 flex items-center justify-between">

                <div>

                  <Dialog.Title className="text-lg font-semibold text-neutral-900">

                    {isCreateMode ? "Novo contrato de fornecedor" : "Editar contrato de fornecedor"}

                  </Dialog.Title>

                  <Dialog.Description className="text-sm text-neutral-500">

                    Preencha os dados e clique em salvar. Pressione ESC ou clique fora para fechar.

                  </Dialog.Description>

                </div>

                <Dialog.Close asChild>

                  <button

                    className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100"

                    aria-label="Fechar"

                    type="button"

                    onClick={resetForm}

                  >

                    <X className="size-4" />

                  </button>

                </Dialog.Close>

              </div>

              {formErrors.general ? (

                <div className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">

                  {formErrors.general}

                </div>

              ) : null}

              <form className="space-y-4" onSubmit={handleSubmit}>

                <div>

                  <label className="text-sm font-medium text-neutral-700">Fornecedor</label>

                  <select

                    name="fornecedor_id"

                    value={formState.fornecedor_id}

                    onChange={handleInputChange}

                    className={clsx(inputClassName(Boolean(formErrors.fornecedor_id)), "mt-2 bg-white")}

                    disabled={supplierSelectDisabled}

                  >

                    <option value="">

                      {supplierSelectDisabled ? "Cadastre fornecedores primeiro" : "Selecione o fornecedor"}

                    </option>

                    {suppliers.map((supplier) => (

                      <option key={supplier.id} value={supplier.id}>

                        {supplier.nome}

                      </option>

                    ))}

                  </select>

                  {formErrors.fornecedor_id ? (

                    <p className="mt-1 text-xs text-danger">{formErrors.fornecedor_id}</p>

                  ) : null}

                </div>

                <div>

                  <label className="text-sm font-medium text-neutral-700">Número do contrato</label>

                  <input

                    type="text"

                    name="numero_contrato"

                    value={formState.numero_contrato}

                    onChange={handleInputChange}

                    className={clsx(inputClassName(Boolean(formErrors.numero_contrato)), "mt-2")}

                  />

                  {formErrors.numero_contrato ? (

                    <p className="mt-1 text-xs text-danger">{formErrors.numero_contrato}</p>

                  ) : null}

                </div>

                <div className="grid gap-4 md:grid-cols-2">

                  <div>

                    <label className="text-sm font-medium text-neutral-700">Início da vigência</label>

                    <input

                      type="date"

                      name="data_inicio"

                      value={formState.data_inicio}

                      onChange={handleInputChange}

                      className={clsx(inputClassName(Boolean(formErrors.data_inicio)), "mt-2")}

                    />

                    {formErrors.data_inicio ? (

                      <p className="mt-1 text-xs text-danger">{formErrors.data_inicio}</p>

                    ) : null}

                  </div>

                  <div>

                    <label className="text-sm font-medium text-neutral-700">Fim da vigência</label>

                    <input

                      type="date"

                      name="data_fim"

                      value={formState.data_fim}

                      onChange={handleInputChange}

                      className={clsx(inputClassName(Boolean(formErrors.data_fim)), "mt-2")}

                    />

                    {formErrors.data_fim ? (

                      <p className="mt-1 text-xs text-danger">{formErrors.data_fim}</p>

                    ) : null}

                  </div>

                </div>

                <div className="grid gap-4 md:grid-cols-3">

                  <div>

                    <label className="text-sm font-medium text-neutral-700">Valor total</label>

                    <input

                      type="text"

                      name="valor_total_display"

                      value={formState.valor_total_display}

                      onChange={(event) => handleCurrencyChange(event, "valor_total")}

                      className={clsx(inputClassName(Boolean(formErrors.valor_total)), "mt-2")}

                    />

                    {formErrors.valor_total ? (

                      <p className="mt-1 text-xs text-danger">{formErrors.valor_total}</p>

                    ) : null}

                  </div>

                  <div>

                    <label className="text-sm font-medium text-neutral-700">Valor comprometido</label>

                    <input

                      type="text"

                      name="valor_comprometido_display"

                      value={formState.valor_comprometido_display}

                      onChange={(event) => handleCurrencyChange(event, "valor_comprometido")}

                      className={clsx(inputClassName(Boolean(formErrors.valor_comprometido)), "mt-2")}

                    />

                    {formErrors.valor_comprometido ? (

                      <p className="mt-1 text-xs text-danger">{formErrors.valor_comprometido}</p>

                    ) : null}

                  </div>

                  <div>

                    <label className="text-sm font-medium text-neutral-700">Status</label>

                    <select

                      name="status"

                      value={formState.status}

                      onChange={handleInputChange}

                      className={clsx(inputClassName(Boolean(formErrors.status)), "mt-2 bg-white")}

                    >

                      {STATUS_OPTIONS.map((option) => (

                        <option key={option.value} value={option.value}>

                          {option.label}

                        </option>

                      ))}

                    </select>

                    {formErrors.status ? (

                      <p className="mt-1 text-xs text-danger">{formErrors.status}</p>

                    ) : null}

                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">

                  <Dialog.Close asChild>

                    <Button type="button" variant="outline" onClick={resetForm}>

                      Cancelar

                    </Button>

                  </Dialog.Close>

                  <Button type="submit" disabled={submitDisabled}>

                    {submitting ? "Salvando..." : isCreateMode ? "Criar contrato" : "Atualizar contrato"}

                  </Button>

                </div>

              </form>

            </div>

          </Dialog.Content>

        </Dialog.Portal>

      </Dialog.Root>

      <Dialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>

        <Dialog.Portal>

          <Dialog.Overlay className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm" />

          <Dialog.Content className="fixed inset-0 flex items-center justify-center p-4">

            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">

              <Dialog.Title className="text-lg font-semibold text-neutral-900">

                Confirmar exclusão

              </Dialog.Title>

              <Dialog.Description className="mt-2 text-sm text-neutral-600">

                Tem certeza que deseja excluir o contrato {pendingContract?.numero_contrato} ? Essa ação não pode ser desfeita.

              </Dialog.Description>

              {deleteError ? (

                <div className="mt-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">

                  {deleteError}

                </div>

              ) : null}

              <div className="mt-6 flex justify-end gap-3">

                <Dialog.Close asChild>

                  <Button variant="outline" type="button" onClick={() => setPendingContract(null)}>

                    Cancelar

                  </Button>

                </Dialog.Close>

                <Button

                  variant="destructive"

                  type="button"

                  onClick={handleDelete}

                  disabled={deleteLoading}

                >

                  {deleteLoading ? "Excluindo..." : "Excluir"}

                </Button>

              </div>

            </div>

          </Dialog.Content>

        </Dialog.Portal>

      </Dialog.Root>

    </div>

  );

}

