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
import { useSupabase } from "@/components/providers/supabase-provider";
import { type Database, type TablesRow } from "@/lib/supabase/types";

type ResourceRow = TablesRow<Database["public"]["Tables"]["C_RECURSOS_FORNECEDOR"]>;
type SupplierRow = TablesRow<Database["public"]["Tables"]["C_FORNECEDORES"]>;
type AllocationRow = TablesRow<Database["public"]["Tables"]["C_ALOCACOES_RECURSOS"]> & {
    solicitacao?: { titulo: string | null; codigo_rs: string | null } | { titulo: string | null; codigo_rs: string | null }[] | null;
    ordem_servico?: {
        numero_os: string | null;
        perfil_solicitado?: { nome: string | null } | { nome: string | null }[] | null;
    } | {
        numero_os: string | null;
        perfil_solicitado?: { nome: string | null } | { nome: string | null }[] | null;
    }[] | null;
};

type TimeEntry = {
    id: string;
    recurso_id: string;
    alocacao_id: string;
    projeto?: string | null;
    data: string;
    horas: number | null;
    horasEmMinutos?: number | null;
    horasDescricao?: string;
    hora_inicio: string | null;
    hora_fim: string | null;
    descricao: string;
    aprovado: boolean;
    papel?: string | null;
    created_at?: string;
};

type ResourceWithEntries = ResourceRow & {
    fornecedor?: Pick<SupplierRow, "id" | "nome"> | null;
    perfil?: { id: string; nome: string } | null;
    totalHoras: number;
    apontamentos: TimeEntry[];
    alocacoes?: AllocationRow[];
};

type TimeEntryFormState = {
    recurso_id: string;
    os_id: string;
    projeto_id: string;
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
    os_id: "",
    projeto_id: "",
    data: new Date().toISOString().split("T")[0],
    hora_inicio: "",
    hora_fim: "",
    descricao: ""
};

const TimeEntryFormSchema = z.object({
    recurso_id: z.string().trim().min(1, "Selecione um recurso"),
    os_id: z.string().trim().min(1, "Selecione uma Ordem de Serviço"),
    projeto_id: z.string().optional(),
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

function calculateHours(horaInicio?: string | null, horaFim?: string | null) {
    if (!horaInicio || !horaFim) {
        return { total: null, description: "Sem cálculo: hora inicial/final não informada" };
    }
    const [startHour, startMinute] = horaInicio.split(":").map(Number);
    const [endHour, endMinute] = horaFim.split(":").map(Number);
    if (
        Number.isNaN(startHour) ||
        Number.isNaN(startMinute) ||
        Number.isNaN(endHour) ||
        Number.isNaN(endMinute)
    ) {
        return { total: null, description: "Horas inválidas" };
    }
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;
    if (end <= start) {
        return { total: null, description: "Hora final deve ser maior que a inicial" };
    }
    const totalMinutesRaw = end - start;
    const lunchBreakMinutes = totalMinutesRaw > 60 ? 60 : 0;
    const totalMinutes = Math.max(totalMinutesRaw - lunchBreakMinutes, 0);
    const totalHours = Number((totalMinutes / 60).toFixed(2));
    const totalDisplay = formatMinutesToHours(totalMinutes);
    return {
        total: totalHours,
        totalMinutes,
        description: `${horaInicio} - ${horaFim} (-1h almoço) = ${totalDisplay}`
    };
}

function formatMinutesToHours(totalMinutes?: number | null) {
    if (typeof totalMinutes !== "number" || Number.isNaN(totalMinutes)) return "0h00";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    return `${String(hours)}h${String(minutes).padStart(2, "0")}`;
}

function formatHoursDisplay(hours?: number | null) {
    if (typeof hours !== "number" || Number.isNaN(hours)) return "0h00";
    const totalMinutes = Math.round(hours * 60);
    return formatMinutesToHours(totalMinutes);
}

function formatOSLabel(numeroOs: string | null, perfil: { nome: string | null } | { nome: string | null }[] | null | undefined) {
    if (!numeroOs) return "";

    // Limpa o número da OS (remove ::profile::UUID se existir)
    let rawOs = numeroOs;
    if (rawOs.includes("::profile::")) {
        rawOs = rawOs.split("::profile::")[0];
    }

    // Pega o nome do perfil
    const perfilObj = Array.isArray(perfil) ? perfil[0] : perfil;
    const perfilNome = perfilObj?.nome;

    return rawOs + (perfilNome ? ` - ${perfilNome}` : "");
}

function inputClassName(hasError?: boolean) {
    return clsx(
        "w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-1",
        hasError
            ? "border-danger bg-white"
            : "border-neutral-300 bg-neutral-50 hover:border-brand-500 hover:bg-white"
    );
}

export default function ApontamentoPage() {
    const { supabase } = useSupabase();

    const [resources, setResources] = useState<ResourceWithEntries[]>([]);
    const [availableOSs, setAvailableOSs] = useState<any[]>([]);
    const [availableRSs, setAvailableRSs] = useState<any[]>([]);
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

            // Carregar Recursos e Alocações
            const { data: resourcesData, error: resourcesError } = await supabase
                .from("C_RECURSOS_FORNECEDOR")
                .select(`
                    *,
                    fornecedor:C_FORNECEDORES (
                        id,
                        nome
                    ),
                    perfil:C_PERFIS_RECURSOS (
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
                        solicitacao:C_REQUISICOES_SERVICO ( codigo_rs, titulo ),
                        ordem_servico:C_ORDENS_SERVICO ( 
                            numero_os,
                            perfil_solicitado:C_PERFIS_RECURSOS ( nome )
                        ),
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
                .eq("ativo", true)
                .order("nome_completo");

            if (resourcesError) throw resourcesError;

            // Carregar OSs para o dropdown
            const { data: osData, error: osError } = await supabase
                .from("C_ORDENS_SERVICO")
                .select(`
                    id,
                    numero_os,
                    perfil_solicitado:C_PERFIS_RECURSOS ( nome ),
                    contrato:C_CONTRATOS_FORNECEDOR!inner (
                        fornecedor_id
                    )
                `);

            if (osError) throw osError;
            setAvailableOSs(osData || []);

            // Carregar RSs (Projetos) para o dropdown
            const { data: rsData, error: rsError } = await supabase
                .from("C_REQUISICOES_SERVICO")
                .select("id, codigo_rs, titulo")
                .neq("status", "encerrada")
                .order("titulo");

            if (rsError) throw rsError;
            setAvailableRSs(rsData || []);

            const processedResources: ResourceWithEntries[] = (resourcesData || []).map((res: any) => {
                const allEntries: TimeEntry[] = [];
                const allocations = res.alocacoes || [];

                allocations.forEach((alloc: any) => {
                    const entries = alloc.apontamentos || [];
                    entries.forEach((entry: any) => {
                        if (entry.data_trabalho >= startDate && entry.data_trabalho <= endDate) {
                            const hoursCalc = calculateHours(entry.hora_inicio, entry.hora_fim);
                            const horasTotal = hoursCalc.total ?? entry.horas ?? 0;
                            const horasMinutos = hoursCalc.totalMinutes ?? (entry.horas ? Math.round(entry.horas * 60) : null);

                            // Supabase retorna arrays em relacionamentos; pegamos o primeiro item
                            const solicitacao = Array.isArray(alloc.solicitacao) ? alloc.solicitacao[0] : alloc.solicitacao;
                            const ordemServico = Array.isArray(alloc.ordem_servico) ? alloc.ordem_servico[0] : alloc.ordem_servico;

                            // Formata o título do projeto com RS e OS
                            const rsTitulo = solicitacao?.titulo || "Sem título";

                            const osLabel = formatOSLabel(ordemServico?.numero_os, ordemServico?.perfil_solicitado);
                            const osNumero = osLabel ? `(OS: ${osLabel})` : "";
                            const projetoLabel = `${rsTitulo} ${osNumero}`.trim();

                            allEntries.push({
                                id: entry.id,
                                recurso_id: res.id,
                                alocacao_id: alloc.id,
                                projeto: projetoLabel,
                                data: entry.data_trabalho,
                                horas: horasTotal,
                                horasEmMinutos: horasMinutos,
                                horasDescricao: hoursCalc.description,
                                hora_inicio: entry.hora_inicio,
                                hora_fim: entry.hora_fim,
                                descricao: entry.descricao || "",
                                aprovado: entry.aprovado || false,
                                papel: alloc.papel
                            });
                        }
                    });
                });

                allEntries.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

                const totalHoras = allEntries.reduce((acc, curr) => acc + (curr.horas || 0), 0);

                return {
                    ...res,
                    fornecedor: Array.isArray(res.fornecedor) ? res.fornecedor[0] : res.fornecedor,
                    perfil: Array.isArray(res.perfil) ? res.perfil[0] : res.perfil,
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

        // Encontrar a alocação para preencher OS e Projeto
        const resource = resources.find(r => r.id === recursoId);
        const allocation = resource?.alocacoes?.find(a => a.id === entry.alocacao_id);

        setFormState({
            recurso_id: recursoId,
            os_id: allocation?.ordem_servico_id || "",
            projeto_id: allocation?.solicitacao_id || "",
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
        if (name === "recurso_id") {
            // Ao mudar recurso, reseta OS e Projeto
            setFormState((prev) => ({ ...prev, recurso_id: value, os_id: "", projeto_id: "" }));
            return;
        }
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

            // Buscar alocação existente ou criar nova
            let query = supabase
                .from("C_ALOCACOES_RECURSOS")
                .select("id")
                .eq("recurso_fornecedor_id", formState.recurso_id)
                .eq("ordem_servico_id", formState.os_id);

            if (formState.projeto_id) {
                query = query.eq("solicitacao_id", formState.projeto_id);
            } else {
                query = query.is("solicitacao_id", null);
            }

            const { data: existingAlloc, error: findError } = await (query as any).maybeSingle();

            if (findError) throw findError;

            let finalAllocationId = existingAlloc?.id;

            if (!finalAllocationId) {
                // Criar nova alocação
                const { data: newAlloc, error: createError } = await (supabase
                    .from("C_ALOCACOES_RECURSOS") as any)
                    .insert({
                        recurso_fornecedor_id: formState.recurso_id,
                        ordem_servico_id: formState.os_id,
                        solicitacao_id: formState.projeto_id || null,
                        inicio_alocacao: formState.data // Data do apontamento como início
                    })
                    .select("id")
                    .single();

                if (createError) throw createError;
                finalAllocationId = newAlloc.id;
            }

            const hoursCalc = calculateHours(formState.hora_inicio, formState.hora_fim);
            if (hoursCalc.total === null) {
                setFormErrors({
                    hora_fim: hoursCalc.description.includes("final") ? hoursCalc.description : undefined,
                    general: "Não foi possível calcular as horas. Verifique início e fim."
                });
                setSubmitting(false);
                return;
            }

            if (formMode === "create") {
                const { error: insertError } = await (supabase
                    .from("C_APONTAMENTOS_TEMPO") as any)
                    .insert({
                        alocacao_id: finalAllocationId,
                        data_trabalho: formState.data,
                        hora_inicio: formState.hora_inicio,
                        hora_fim: formState.hora_fim,
                        aprovado: false,
                        descricao: formState.descricao
                    });

                if (insertError) throw insertError;
            } else if (formMode === "edit" && activeEntryId) {
                // Nota: Se mudou a alocação (OS/Projeto), o update deve atualizar o alocacao_id também?
                // Sim, se o usuário mudou OS/Projeto, o apontamento deve apontar para a nova alocação.
                const { error: updateError } = await (supabase
                    .from("C_APONTAMENTOS_TEMPO") as any)
                    .update({
                        alocacao_id: finalAllocationId, // Atualiza alocação caso tenha mudado
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

            const { error: updateError } = await (supabase
                .from("C_APONTAMENTOS_TEMPO") as any)
                .update({ aprovado: true })
                .eq("id", entryId);

            if (updateError) throw updateError;

            await loadData();
        } catch (err) {
            console.error("Erro ao aprovar apontamento", err);
        }
    };

    // Helper para filtrar OSs do fornecedor selecionado
    const getSupplierOSs = () => {
        if (!formState.recurso_id) return [];
        const resource = resources.find(r => r.id === formState.recurso_id);
        if (!resource) return [];

        return availableOSs.filter((os: any) =>
            os.contrato?.fornecedor_id === resource.fornecedor_id
        );
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
                                                        {resource.perfil?.nome && (
                                                            <span className="ml-2 border-l border-neutral-300 pl-2">
                                                                {resource.perfil.nome}
                                                            </span>
                                                        )}
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
                                                                        {entry.horasEmMinutos
                                                                            ? formatMinutesToHours(entry.horasEmMinutos)
                                                                            : formatHoursDisplay(entry.horas)}
                                                                    </span>
                                                                    <span className="text-xs text-neutral-500">
                                                                        ({entry.hora_inicio?.slice(0, 5)} - {entry.hora_fim?.slice(0, 5)})
                                                                    </span>
                                                                    {entry.projeto ? (
                                                                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                                                                            Projeto: {entry.projeto}
                                                                        </span>
                                                                    ) : null}
                                                                    {entry.papel ? (
                                                                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                                                            Papel: {entry.papel}
                                                                        </span>
                                                                    ) : null}
                                                                    {entry.aprovado && (
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <span className="cursor-default rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                                                                                    Aprovado
                                                                                </span>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                <p>Este apontamento já foi aprovado</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    )}
                                                                </div>
                                                                {entry.horasDescricao ? (
                                                                    <p className="text-xs text-neutral-500">
                                                                        {entry.horasDescricao}
                                                                    </p>
                                                                ) : null}
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
                    </Card>
                )}

                <Dialog.Root open={formOpen} onOpenChange={handleFormDialogChange}>
                    <Dialog.Portal>
                        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity" />
                        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl transition-all">
                            <div className="flex items-center justify-between">
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
                                    <label htmlFor="os_id" className="block text-sm font-medium text-neutral-700">
                                        Ordem de Serviço (OS) <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        id="os_id"
                                        name="os_id"
                                        value={formState.os_id}
                                        onChange={handleInputChange}
                                        className={inputClassName(!!formErrors.os_id)}
                                        disabled={!formState.recurso_id}
                                    >
                                        <option value="">
                                            {formState.recurso_id
                                                ? "Selecione a OS"
                                                : "Selecione um recurso primeiro"}
                                        </option>
                                        {getSupplierOSs().map((os: any) => (
                                            <option key={os.id} value={os.id}>
                                                {formatOSLabel(os.numero_os, os.perfil_solicitado)}
                                            </option>
                                        ))}
                                    </select>
                                    {formErrors.os_id && (
                                        <p className="mt-1 text-xs text-danger">{formErrors.os_id}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="projeto_id" className="block text-sm font-medium text-neutral-700">
                                        Projeto (RS) <span className="text-xs font-normal text-neutral-400">(Opcional)</span>
                                    </label>
                                    <select
                                        id="projeto_id"
                                        name="projeto_id"
                                        value={formState.projeto_id}
                                        onChange={handleInputChange}
                                        className={inputClassName(!!formErrors.projeto_id)}
                                        disabled={!formState.recurso_id}
                                    >
                                        <option value="">Sem projeto</option>
                                        {availableRSs.map((rs: any) => (
                                            <option key={rs.id} value={rs.id}>
                                                {rs.titulo} ({rs.codigo_rs})
                                            </option>
                                        ))}
                                    </select>
                                    {formErrors.projeto_id && (
                                        <p className="mt-1 text-xs text-danger">{formErrors.projeto_id}</p>
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
