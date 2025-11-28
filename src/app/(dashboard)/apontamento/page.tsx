"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import clsx from "clsx";
import * as Dialog from "@radix-ui/react-dialog";
import * as Accordion from "@radix-ui/react-accordion";
import {
    Plus,
    Search,
    X,
    Pencil,
    CheckCircle,
    ChevronDown,
    Calendar,
    Clock
} from "lucide-react";
import { z } from "zod";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from "@/components/ui/tooltip";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { type Database, type TablesRow } from "@/lib/supabase/types";

type ResourceRow = TablesRow<Database["public"]["Tables"]["C_RECURSOS_FORNECEDOR"]>;
type SupplierRow = TablesRow<Database["public"]["Tables"]["C_FORNECEDORES"]>;
type AllocationRow = TablesRow<Database["public"]["Tables"]["C_ALOCACOES_RECURSOS"]>;

type TimeEntry = {
    id: string;
    recurso_id: string;
    alocacao_id: string;
    data: string;
    horas: number | null;
    hora_inicio: string | null;
    hora_fim: string | null;
    descricao: string;
    aprovado: boolean;
    created_at?: string;
};

type ResourceWithEntries = ResourceRow & {
    fornecedor?: Pick<SupplierRow, "id" | "nome"> | null;
    totalHoras: number;
    apontamentos: TimeEntry[];
    alocacoes?: AllocationRow[];
};

type TimeEntryFormState = {
    recurso_id: string;
    data: string;
    hora_inicio: string;
    hora_fim: string;
    descricao: string;
};

type FormErrors = Partial<Record<keyof TimeEntryFormState, string>> & {
    general?: string;
};

const EMPTY_FORM_STATE: TimeEntryFormState = {
    recurso_id: "",
    data: new Date().toISOString().split("T")[0],
    hora_inicio: "",
    hora_fim: "",
    descricao: ""
};

const TimeEntryFormSchema = z.object({
    recurso_id: z.string().trim().min(1, "Selecione um recurso"),
    data: z.string().trim().min(1, "Informe a data"),
    hora_inicio: z.string().trim().min(1, "Informe a hora de início"),
    hora_fim: z.string().trim().min(1, "Informe a hora de fim"),
    descricao: z.string().optional()
}).refine((data) => {
    if (data.hora_inicio && data.hora_fim) {
        return data.hora_fim > data.hora_inicio;
    }
    return true;
}, {
    message: "Hora fim deve ser maior que hora início",
    path: ["hora_fim"]
});

function inputClassName(hasError?: boolean) {
    return clsx(
        "w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-1",
        hasError
            ? "border-danger bg-white"
            : "border-neutral-300 bg-neutral-50 hover:border-brand-500 hover:bg-white"
    );
}

export default function ApontamentoPage() {
    const supabase = useMemo(() => createSupabaseBrowserClient(), []);

    const [resources, setResources] = useState<ResourceWithEntries[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [formOpen, setFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<"create" | "edit">("create");
    const [formState, setFormState] = useState<TimeEntryFormState>({ ...EMPTY_FORM_STATE });
    const [formErrors, setFormErrors] = useState<FormErrors>({});
    const [submitting, setSubmitting] = useState(false);
    const [activeEntryId, setActiveEntryId] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    });

    const activeEntry = useMemo(() => {
        if (!activeEntryId) return null;
        for (const resource of resources) {
            const entry = resource.apontamentos.find((a) => a.id === activeEntryId);
            if (entry) return entry;
        }
        return null;
    }, [activeEntryId, resources]);

    const loadData = useCallback(async () => {
        if (!supabase) {
            setError("Supabase não configurado");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const [year, month] = selectedMonth.split("-");
            const startDate = `${year}-${month}-01`;
            const nextMonth = new Date(parseInt(year), parseInt(month), 1);
            const endDate = new Date(nextMonth.getTime() - 1).toISOString().split("T")[0];

            const { data: resourcesData, error: resourcesError } = await supabase
                .from("C_RECURSOS_FORNECEDOR")
                .select(`
                    *,
                    fornecedor:C_FORNECEDORES (
                        id,
                        nome
                    ),
                    alocacoes:C_ALOCACOES_RECURSOS (
                        id,
                        solicitacao_id,
                        recurso_fornecedor_id,
                        ordem_servico_id,
                        papel,
                        inicio_alocacao,
                        fim_alocacao,
                        apontamentos:C_APONTAMENTOS_TEMPO (
                            id,
                            alocacao_id,
                            data_trabalho,
                            horas,
                            hora_inicio,
                            hora_fim,
                            aprovado,
                            mes_faturamento,
                            descricao
                        )
                    )
                `)
                .eq("ativo", true);

            if (resourcesError) throw resourcesError;

            const processedResources: ResourceWithEntries[] = (resourcesData || []).map((res: any) => {
                const allEntries: TimeEntry[] = [];
                const allocations = res.alocacoes || [];

                allocations.forEach((alloc: any) => {
                    const entries = alloc.apontamentos || [];
                    entries.forEach((entry: any) => {
                        if (entry.data_trabalho >= startDate && entry.data_trabalho <= endDate) {
                            allEntries.push({
                                id: entry.id,
                                recurso_id: res.id,
                                alocacao_id: alloc.id,
                                data: entry.data_trabalho,
                                horas: entry.horas,
                                hora_inicio: entry.hora_inicio,
                                hora_fim: entry.hora_fim,
                                descricao: entry.descricao || "",
                                aprovado: entry.aprovado || false
                            });
                        }
                    });
                });

                allEntries.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

                const totalHoras = allEntries.reduce((acc, curr) => acc + (curr.horas || 0), 0);

                return {
                    ...res,
                    totalHoras,
                    apontamentos: allEntries,
                    alocacoes: allocations
                };
            });

            setResources(processedResources);
        } catch (err) {
            setError("Erro ao carregar dados");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, supabase]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const filteredResources = useMemo(() => {
        const normalized = searchTerm.trim().toLowerCase();
        return resources.filter((resource) => {
            const supplierName = resource.fornecedor?.nome ?? "";

            const matchesSearch =
                normalized.length === 0 ||
                resource.nome_completo?.toLowerCase().includes(normalized) ||
                resource.email?.toLowerCase().includes(normalized) ||
                supplierName.toLowerCase().includes(normalized);

            return matchesSearch;
        });
    }, [resources, searchTerm]);

    const resetForm = useCallback(() => {
        setFormState({ ...EMPTY_FORM_STATE });
        setFormErrors({});
        setActiveEntryId(null);
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
        setFormMode("create");
        resetForm();
        setFormOpen(true);
    };

    const openEditForm = (entry: TimeEntry, recursoId: string) => {
        setFormMode("edit");
        setActiveEntryId(entry.id);
        setFormState({
            recurso_id: recursoId,
            data: entry.data,
            hora_inicio: entry.hora_inicio || "",
            hora_fim: entry.hora_fim || "",
            descricao: entry.descricao
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

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormErrors({});

        const parsed = TimeEntryFormSchema.safeParse(formState);
        if (!parsed.success) {
            const fieldErrors = parsed.error.flatten().fieldErrors;
            const formattedErrors: FormErrors = {};
            (Object.keys(fieldErrors) as (keyof typeof fieldErrors)[]).forEach((key) => {
                const [message] = fieldErrors[key] ?? [];
                if (message) {
                    formattedErrors[key as keyof TimeEntryFormState] = message;
                }
            });
            setFormErrors(formattedErrors);
            return;
        }

        setSubmitting(true);

        try {
            if (!supabase) throw new Error("Supabase não configurado");

            const selectedResource = resources.find(r => r.id === formState.recurso_id);
            if (!selectedResource) {
                throw new Error("Recurso não encontrado");
            }

            const allocation = selectedResource.alocacoes?.[0];

            if (!allocation) {
                setFormErrors({
                    general: "Este recurso não possui alocação ativa. Não é possível lançar horas."
                });
                setSubmitting(false);
                return;
            }

            if (formMode === "create") {
                const { error: insertError } = await supabase
                    .from("C_APONTAMENTOS_TEMPO")
                    .insert({
                        alocacao_id: allocation.id,
                        data_trabalho: formState.data,
                        hora_inicio: formState.hora_inicio,
                        hora_fim: formState.hora_fim,
                        aprovado: false,
                        descricao: formState.descricao
                    });

                if (insertError) throw insertError;
            } else if (formMode === "edit" && activeEntryId) {
                const { error: updateError } = await supabase
                    .from("C_APONTAMENTOS_TEMPO")
                    .update({
                        data_trabalho: formState.data,
                        hora_inicio: formState.hora_inicio,
                        hora_fim: formState.hora_fim,
                        descricao: formState.descricao
                    })
                    .eq("id", activeEntryId);

                if (updateError) throw updateError;
            }

            setFormOpen(false);
            resetForm();
            await loadData();
        } catch (err: any) {
            console.error(err);
            setFormErrors({
                general: err.message || "Erro ao salvar o apontamento. Tente novamente."
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleApprove = async (entryId: string) => {
        try {
            if (!supabase) return;

            const { error: updateError } = await supabase
                .from("C_APONTAMENTOS_TEMPO")
                .update({ aprovado: true })
                .eq("id", entryId);

            if (updateError) throw updateError;

            await loadData();
        } catch (err) {
            console.error("Erro ao aprovar apontamento", err);
        }
    };

    return (
        <TooltipProvider>
            <div className="space-y-6">
                <PageHeader
                    title="Apontamento de Horas"
                    subtitle="Gerencie e aprove os apontamentos de horas dos recursos."
                    actions={
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button onClick={openCreateForm}>
                                    <Plus className="mr-2 size-4" />
                                    Novo Apontamento
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Criar um novo apontamento de horas</p>
                            </TooltipContent>
                        </Tooltip>
                    }
                />

                {error ? (
                    <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                        {error}
                    </div>
                ) : null}

                <div className="flex flex-col gap-4 md:flex-row md:items-end">
                    <div className="w-full md:max-w-md">
                        <label className="text-sm font-medium text-neutral-600">
                            Buscar por recurso ou fornecedor
                        </label>
                        <div className="relative mt-2">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                            <input
                                type="text"
                                placeholder="Ex.: João Silva ou Tech Solutions"
                                className="w-full rounded-lg border border-neutral-200 py-2 pl-10 pr-3 text-sm text-neutral-800 focus:border-brand-500 focus:outline-none"
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                            />
                        </div>
                    </div>

                    <div className="w-full md:max-w-xs">
                        <label className="text-sm font-medium text-neutral-600">Mês de referência</label>
                        <div className="relative mt-2">
                            <Calendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(event) => setSelectedMonth(event.target.value)}
                                className="w-full rounded-lg border border-neutral-200 py-2 pl-10 pr-3 text-sm text-neutral-800 focus:border-brand-500 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-neutral-500">Carregando...</div>
                    </div>
                ) : (
                    <Card className="overflow-hidden">
                        <Accordion.Root type="multiple" className="w-full">
                            {filteredResources.map((resource) => (
                                <Accordion.Item
                                    key={resource.id}
                                    value={resource.id}
                                    className="border-b border-neutral-100 last:border-b-0"
                                >
                                    <Accordion.Header>
                                        <Accordion.Trigger className="group flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-neutral-50">
                                            <div className="flex flex-1 items-center gap-4">
                                                <div className="flex-1">
                                                    <div className="font-semibold text-neutral-900">
                                                        {resource.nome_completo}
                                                    </div>
                                                    <div className="mt-1 text-sm text-neutral-500">
                                                        {resource.fornecedor?.nome ?? "Sem fornecedor"}
                                                    </div>
                                                </div>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2">
                                                            <Clock className="size-4 text-brand-600" />
                                                            <span className="font-semibold text-brand-700">
                                                                {resource.totalHoras.toFixed(2)}h
                                                            </span>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Total de horas no mês</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                            <ChevronDown className="ml-4 size-5 text-neutral-400 transition-transform group-data-[state=open]:rotate-180" />
                                        </Accordion.Trigger>
                                    </Accordion.Header>
                                    <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                                        <div className="bg-neutral-25 px-6 py-4">
                                            {resource.apontamentos.length === 0 ? (
                                                <div className="py-8 text-center text-sm text-neutral-500">
                                                    Nenhum apontamento neste mês
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {resource.apontamentos.map((entry) => (
                                                        <div
                                                            key={entry.id}
                                                            className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3 transition-shadow hover:shadow-sm"
                                                        >
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-sm font-medium text-neutral-700">
                                                                        {new Date(entry.data + "T00:00:00").toLocaleDateString("pt-BR")}
                                                                    </span>
                                                                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                                                                        {entry.horas?.toFixed(2) || "0.00"}h
                                                                    </span>
                                                                    <span className="text-xs text-neutral-500">
                                                                        ({entry.hora_inicio?.slice(0, 5)} - {entry.hora_fim?.slice(0, 5)})
                                                                    </span>
                                                                    {entry.aprovado && (
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 cursor-default">
                                                                                    Aprovado
                                                                                </span>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                <p>Este apontamento já foi aprovado</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    )}
                                                                </div>
                                                                {entry.descricao && (
                                                                    <p className="mt-1 text-sm text-neutral-600">{entry.descricao}</p>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => openEditForm(entry, resource.id)}
                                                                            className="text-neutral-600 hover:text-brand-600"
                                                                        >
                                                                            <Pencil className="size-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Editar apontamento</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                                {!entry.aprovado && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                onClick={() => handleApprove(entry.id)}
                                                                                className="text-neutral-600 hover:text-green-600"
                                                                            >
                                                                                <CheckCircle className="size-4" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>Aprovar apontamento</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </Accordion.Content>
                                </Accordion.Item>
                            ))}
                        </Accordion.Root>

                        {filteredResources.length === 0 && (
                            <div className="py-12 text-center text-neutral-500">
                                Nenhum recurso encontrado
                            </div>
                        )}
                    </Card>
                )}

                <Dialog.Root open={formOpen} onOpenChange={handleFormDialogChange}>
                    <Dialog.Portal>
                        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-xl border border-neutral-200 bg-white p-6 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
                            <div className="flex items-start justify-between">
                                <Dialog.Title className="text-xl font-semibold text-neutral-900">
                                    {formMode === "create" ? "Novo Apontamento" : "Editar Apontamento"}
                                </Dialog.Title>
                                <Dialog.Close asChild>
                                    <button
                                        className="rounded-lg p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
                                        aria-label="Fechar"
                                    >
                                        <X className="size-5" />
                                    </button>
                                </Dialog.Close>
                            </div>

                            <Dialog.Description className="mt-2 text-sm text-neutral-600">
                                {formMode === "create"
                                    ? "Preencha os dados do apontamento de horas."
                                    : "Atualize os dados do apontamento."}
                            </Dialog.Description>

                            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                                {formErrors.general && (
                                    <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                                        {formErrors.general}
                                    </div>
                                )}

                                <div>
                                    <label htmlFor="recurso_id" className="block text-sm font-medium text-neutral-700">
                                        Recurso <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        id="recurso_id"
                                        name="recurso_id"
                                        value={formState.recurso_id}
                                        onChange={handleInputChange}
                                        className={inputClassName(!!formErrors.recurso_id)}
                                        disabled={formMode === "edit"}
                                    >
                                        <option value="">Selecione um recurso</option>
                                        {resources.map((resource) => (
                                            <option key={resource.id} value={resource.id}>
                                                {resource.nome_completo} - {resource.fornecedor?.nome}
                                            </option>
                                        ))}
                                    </select>
                                    {formErrors.recurso_id && (
                                        <p className="mt-1 text-xs text-danger">{formErrors.recurso_id}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="data" className="block text-sm font-medium text-neutral-700">
                                        Data <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        id="data"
                                        name="data"
                                        value={formState.data}
                                        onChange={handleInputChange}
                                        className={inputClassName(!!formErrors.data)}
                                    />
                                    {formErrors.data && <p className="mt-1 text-xs text-danger">{formErrors.data}</p>}
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label htmlFor="hora_inicio" className="block text-sm font-medium text-neutral-700">
                                            Início <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="time"
                                            id="hora_inicio"
                                            name="hora_inicio"
                                            value={formState.hora_inicio}
                                            onChange={handleInputChange}
                                            className={inputClassName(!!formErrors.hora_inicio)}
                                        />
                                        {formErrors.hora_inicio && (
                                            <p className="mt-1 text-xs text-danger">{formErrors.hora_inicio}</p>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <label htmlFor="hora_fim" className="block text-sm font-medium text-neutral-700">
                                            Fim <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="time"
                                            id="hora_fim"
                                            name="hora_fim"
                                            value={formState.hora_fim}
                                            onChange={handleInputChange}
                                            className={inputClassName(!!formErrors.hora_fim)}
                                        />
                                        {formErrors.hora_fim && (
                                            <p className="mt-1 text-xs text-danger">{formErrors.hora_fim}</p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="descricao" className="block text-sm font-medium text-neutral-700">
                                        Descrição
                                    </label>
                                    <textarea
                                        id="descricao"
                                        name="descricao"
                                        rows={3}
                                        value={formState.descricao}
                                        onChange={handleInputChange}
                                        className={inputClassName(!!formErrors.descricao)}
                                        placeholder="Descreva as atividades realizadas (Opcional)"
                                    />
                                    {formErrors.descricao && (
                                        <p className="mt-1 text-xs text-danger">{formErrors.descricao}</p>
                                    )}
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    {formMode === "edit" && activeEntry && !activeEntry.aprovado && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="mr-auto text-green-600 hover:bg-green-50 hover:text-green-700"
                                            onClick={() => {
                                                handleApprove(activeEntry.id);
                                                setFormOpen(false);
                                            }}
                                        >
                                            <CheckCircle className="mr-2 size-4" />
                                            Aprovar
                                        </Button>
                                    )}
                                    <Dialog.Close asChild>
                                        <Button type="button" variant="secondary">
                                            Cancelar
                                        </Button>
                                    </Dialog.Close>
                                    <Button type="submit" disabled={submitting}>
                                        {submitting ? "Salvando..." : formMode === "create" ? "Criar" : "Salvar"}
                                    </Button>
                                </div>
                            </form>
                        </Dialog.Content>
                    </Dialog.Portal>
                </Dialog.Root>
            </div>
        </TooltipProvider>
    );
}
