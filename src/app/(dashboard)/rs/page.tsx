"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";
import { PageHeader } from "@/components/common/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import clsx from "clsx";
import { ChevronDown, Plus, Pencil, Trash2, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSupabase } from "@/components/providers/supabase-provider";

type RSStatus = "planejada" | "em_execucao" | "homologacao" | "encerrada";

type RS = {
  id: string;
  code: string;
  espId: string;
  title: string;
  status: RSStatus;
  period: string;
  value: number | null;

  owner: string;
  responsavel_cliente: string;
  responsavel_bu: string;
  raw_inicio: string | null;
  raw_fim: string | null;
};

type ESPRow = {
  id: string;
  contrato_id: string | null;
  numero_especificacao: string | null;
  titulo: string | null;
  contrato?: { id: string; numero_contrato: string | null } | null;
  descricao?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  valor_total: number | null;
  valor_comprometido: number | null;
  valor_disponivel: number | null;
  requisicoes?: RSRow[];
};

type ContractRow = {
  id: string;
  numero_contrato: string | null;
};

type RSRow = {
  id: string;
  especificacao_id: string | null;
  codigo_rs: string | null;
  titulo: string | null;
  status: RSStatus | null;
  inicio_planejado: string | null;
  fim_planejado: string | null;
  inicio_real: string | null;
  fim_real: string | null;
  responsavel_cliente: string | null;
  responsavel_bu: string | null;
  valor_total: number | null;
};

type ESP = {
  id: string;
  contractId: string | null;
  contractNumber: string;
  code: string;
  title: string;
  descricao: string;
  data_inicio: string | null;
  data_fim: string | null;
  value: number | null;
  valor_comprometido: number | null;
  rsList: RS[];
};

const STATUS_LABEL: Record<RSStatus, string> = {
  planejada: "Planejada",
  em_execucao: "Em execução",
  homologacao: "Homologação",
  encerrada: "Encerrada"
};

const statusClass: Record<RSStatus, string> = {
  planejada: "bg-neutral-100 text-neutral-600",
  em_execucao: "bg-brand-50 text-brand-700",
  homologacao: "bg-warning/10 text-warning",
  encerrada: "bg-success/10 text-success"
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatCurrency = (value?: number | null) =>
  typeof value === "number" ? currency.format(value) : "—";
const normalizeCurrencyInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return { raw: "", display: "" };
  const numeric = (Number(digits) / 100).toFixed(2);
  return { raw: numeric, display: currency.format(Number(numeric)) };
};

const formatPeriod = (inicio?: string | null, fim?: string | null) => {
  if (!inicio && !fim) return "Período não informado";
  const formatDate = (d: string) => {
    if (!d) return "?";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };
  const i = inicio ? formatDate(inicio) : "?";
  const f = fim ? formatDate(fim) : "?";
  return `${i} - ${f}`;
};

const mapRs = (rows: RSRow[]): RS[] =>
  rows.map((rs) => ({
    id: rs.id,
    code: rs.codigo_rs ?? rs.id,
    espId: rs.especificacao_id ?? "",
    title: rs.titulo ?? "Título não informado",
    status: (rs.status as RSStatus) ?? "planejada",
    period: formatPeriod(rs.inicio_planejado ?? rs.inicio_real, rs.fim_planejado ?? rs.fim_real),
    value: rs.valor_total ?? null,
    responsavel_cliente: rs.responsavel_cliente ?? "—",
    responsavel_bu: rs.responsavel_bu ?? "—",
    owner: "", // Deprecated
    raw_inicio: rs.inicio_planejado ?? rs.inicio_real ?? null,
    raw_fim: rs.fim_planejado ?? rs.fim_real ?? null
  }));

export default function RSPage() {
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [espData, setEspData] = useState<ESP[]>([]);
  const [espDialogOpen, setEspDialogOpen] = useState(false);
  const [rsDialogOpen, setRsDialogOpen] = useState(false);
  const [selectedEspId, setSelectedEspId] = useState<string | null>(null);
  const [activeRsId, setActiveRsId] = useState<string | null>(null);
  const [espDialogMode, setEspDialogMode] = useState<"create" | "edit">("create");
  const [rsDialogMode, setRsDialogMode] = useState<"create" | "edit">("create");
  const [espForm, setEspForm] = useState({
    id: "",
    numero_especificacao: "",
    contrato_id: "",
    titulo: "",
    descricao: "",
    data_inicio: "",
    data_fim: "",
    valor_total: "",
    valor_total_display: "",
    valor_comprometido: "",
    valor_comprometido_display: ""
  });
  const [rsForm, setRsForm] = useState({
    id: "",
    especificacao_id: "",
    codigo_rs: "",
    titulo: "",
    status: "planejada",
    inicio_planejado: "",
    fim_planejado: "",
    responsavel_cliente: "",
    responsavel_bu: "",
    valor_total: "",
    valor_total_display: ""
  });
  const [savingEsp, setSavingEsp] = useState(false);
  const [savingRs, setSavingRs] = useState(false);
  const [deletingEspId, setDeletingEspId] = useState<string | null>(null);
  const [deletingRsId, setDeletingRsId] = useState<string | null>(null);
  const [confirmDeleteEspId, setConfirmDeleteEspId] = useState<string | null>(null);
  const [confirmDeleteRsId, setConfirmDeleteRsId] = useState<string | null>(null);
  const [contracts, setContracts] = useState<ContractRow[]>([]);

  const activeEsp = useMemo(
    () => espData.find((esp) => esp.id === selectedEspId) ?? null,
    [espData, selectedEspId]
  );

  const loadData = useCallback(async () => {
    if (!supabase) {
      setError("Supabase não configurado.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("C_ESPECIFICACOES_SERVICO")
      .select(
        `
        id,
        contrato_id,
        numero_especificacao,
        titulo,
        descricao,
        data_inicio,
        data_fim,
        valor_total,
        valor_comprometido,
        valor_disponivel,
        requisicoes:C_REQUISICOES_SERVICO (
          id,
          codigo_rs,
          titulo,
          status,
          inicio_planejado,
          fim_planejado,
          inicio_real,
          fim_real,
          responsavel_cliente,
          responsavel_bu,
          valor_total,
          especificacao_id
        ),
        contrato:C_CONTRATOS_CLIENTE (
          id,
          numero_contrato
        )
      `
      )
      .order("numero_especificacao", { ascending: true });

    if (fetchError) {
      setError(fetchError.message ?? "Não foi possível carregar ESP/RS.");
      setLoading(false);
      return;
    }

    const mapped: ESP[] = (data as (ESPRow & { requisicoes?: RSRow[] })[]).map((esp) => ({
      id: esp.id,
      contractId: esp.contrato_id ?? null,
      contractNumber: esp.contrato?.numero_contrato ?? "Contrato não informado",
      code: esp.numero_especificacao ?? esp.id,
      title: esp.titulo ?? "Título não informado",
      descricao: esp.descricao ?? "",
      data_inicio: esp.data_inicio ?? null,
      data_fim: esp.data_fim ?? null,
      value: typeof esp.valor_total === "number" ? Number(esp.valor_total) : null,
      valor_comprometido:
        typeof esp.valor_comprometido === "number" ? Number(esp.valor_comprometido) : null,
      rsList: mapRs(esp.requisicoes ?? [])
    }));

    setEspData(mapped);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const loadContracts = async () => {
      if (!supabase) return;
      const { data } = await supabase
        .from("C_CONTRATOS_CLIENTE")
        .select("id, numero_contrato")
        .order("numero_contrato", { ascending: true });
      setContracts((data as ContractRow[]) ?? []);
    };
    void loadContracts();
  }, [supabase]);

  const openCreateEsp = () => {
    setEspDialogMode("create");
    setSelectedEspId(null);
    setEspForm({
      id: "",
      numero_especificacao: "",
      contrato_id: "",
      titulo: "",
      descricao: "",
      data_inicio: "",
      data_fim: "",
      valor_total: "",
      valor_total_display: "",
      valor_comprometido: "",
      valor_comprometido_display: ""
    });
    setEspDialogOpen(true);
  };

  const openEditEsp = (espId: string) => {
    setEspDialogMode("edit");
    setSelectedEspId(espId);
    const esp = espData.find((item) => item.id === espId);
    if (esp) {
      setEspForm({
        id: esp.id,
        numero_especificacao: esp.code ?? "",
        contrato_id: esp.contractId ?? "",
        titulo: esp.title ?? "",
        descricao: esp.descricao ?? "",
        data_inicio: esp.data_inicio ?? "",
        data_fim: esp.data_fim ?? "",
        valor_total: esp.value?.toString() ?? "",
        valor_total_display: formatCurrency(esp.value ?? null),
        valor_comprometido: esp.valor_comprometido?.toString() ?? "",
        valor_comprometido_display: formatCurrency(esp.valor_comprometido ?? null)
      });
    }
    setEspDialogOpen(true);
  };

  const openCreateRs = (espId: string) => {
    setRsDialogMode("create");
    setSelectedEspId(espId);
    setActiveRsId(null);
    setRsForm({
      id: "",
      especificacao_id: espId ?? "",
      codigo_rs: "",
      titulo: "",
      status: "planejada",
      inicio_planejado: "",
      fim_planejado: "",
      responsavel_cliente: "",
      responsavel_bu: "",
      valor_total: "",
      valor_total_display: ""
    });
    setRsDialogOpen(true);
  };

  const openEditRs = (espId: string, rsId: string) => {
    setRsDialogMode("edit");
    setSelectedEspId(espId);
    setActiveRsId(rsId);
    const esp = espData.find((item) => item.id === espId);
    const rs = esp?.rsList.find((item) => item.id === rsId);
    if (rs) {
      setRsForm({
        id: rs.id,
        especificacao_id: espId,
        codigo_rs: rs.code,
        titulo: rs.title,
        status: rs.status,
        inicio_planejado: rs.raw_inicio ?? "",
        fim_planejado: rs.raw_fim ?? "",
        responsavel_cliente: rs.responsavel_cliente === "—" ? "" : rs.responsavel_cliente,
        responsavel_bu: rs.responsavel_bu === "—" ? "" : rs.responsavel_bu,
        valor_total: rs.value?.toString() ?? "",
        valor_total_display: formatCurrency(rs.value ?? null)
      });
    }
    setRsDialogOpen(true);
  };

  const handleEspSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setSavingEsp(true);
    const payload = {
      numero_especificacao: espForm.numero_especificacao.trim(),
      contrato_id: espForm.contrato_id.trim() || null,
      titulo: espForm.titulo.trim() || null,
      descricao: espForm.descricao.trim() || null,
      data_inicio: espForm.data_inicio || null,
      data_fim: espForm.data_fim || null,
      valor_total: espForm.valor_total ? Number(espForm.valor_total) : null,
      valor_comprometido: espForm.valor_comprometido ? Number(espForm.valor_comprometido) : null
    };
    const query = supabase.from("C_ESPECIFICACOES_SERVICO") as any;
    const response =
      espDialogMode === "edit" && espForm.id
        ? await query.update(payload).eq("id", espForm.id)
        : await query.insert(payload);
    setSavingEsp(false);
    if (response.error) {
      setError(response.error.message ?? "Não foi possível salvar a ESP.");
      return;
    }
    setEspForm({
      id: "",
      numero_especificacao: "",
      contrato_id: "",
      titulo: "",
      descricao: "",
      data_inicio: "",
      data_fim: "",
      valor_total: "",
      valor_total_display: "",
      valor_comprometido: "",
      valor_comprometido_display: ""
    });
    setEspDialogOpen(false);
    await loadData();
  };

  const handleRsSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setSavingRs(true);
    const payload = {
      especificacao_id: rsForm.especificacao_id || selectedEspId,
      codigo_rs: rsForm.codigo_rs.trim(),
      titulo: rsForm.titulo.trim(),
      status: (rsForm.status || "planejada").trim() as RSStatus,
      inicio_planejado: rsForm.inicio_planejado || null,
      fim_planejado: rsForm.fim_planejado || null,
      responsavel_cliente: rsForm.responsavel_cliente || null,
      responsavel_bu: rsForm.responsavel_bu || null,
      valor_total: rsForm.valor_total ? Number(rsForm.valor_total) : null
    };
    const query = supabase.from("C_REQUISICOES_SERVICO") as any;
    const response =
      rsDialogMode === "edit" && rsForm.id
        ? await query.update(payload).eq("id", rsForm.id)
        : await query.insert(payload);
    setSavingRs(false);
    if (response.error) {
      setError(response.error.message ?? "Não foi possível salvar a RS.");
      return;
    }
    setRsForm({
      id: "",
      especificacao_id: "",
      codigo_rs: "",
      titulo: "",
      status: "planejada",
      inicio_planejado: "",
      fim_planejado: "",
      responsavel_cliente: "",
      responsavel_bu: "",
      valor_total: "",
      valor_total_display: ""
    });
    setRsDialogOpen(false);
    await loadData();
  };

  const handleEspDelete = async (id: string) => {
    if (!supabase) return;
    setDeletingEspId(id);
    const { error: delError } = await supabase.from("C_ESPECIFICACOES_SERVICO").delete().eq("id", id);
    setDeletingEspId(null);
    if (delError) {
      setError(delError.message ?? "Não foi possível excluir a ESP.");
      return;
    }
    setConfirmDeleteEspId(null);
    await loadData();
  };

  const handleRsDelete = async (id: string) => {
    if (!supabase) return;
    setDeletingRsId(id);
    const { error: delError } = await supabase.from("C_REQUISICOES_SERVICO").delete().eq("id", id);
    setDeletingRsId(null);
    if (delError) {
      setError(delError.message ?? "Não foi possível excluir a RS.");
      return;
    }
    setConfirmDeleteRsId(null);
    await loadData();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requisições de Serviço"
        subtitle="Visualize ESP e suas RS relacionadas, com CRUD por modal."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={openCreateEsp} disabled={!supabase}>
              <Plus className="mr-2 size-4" />
              Nova ESP
            </Button>
            <Button
              onClick={() => openCreateRs(espData[0]?.id ?? "")}
              disabled={!supabase || espData.length === 0}
            >
              <Plus className="mr-2 size-4" />
              Nova RS
            </Button>
          </div>
        }
      />

      <Card className="p-0">
        {loading ? (
          <div className="p-4 text-sm text-neutral-600">Carregando ESP/RS...</div>
        ) : error ? (
          <div className="p-4 text-sm text-danger">{error}</div>
        ) : espData.length === 0 ? (
          <div className="p-4 text-sm text-neutral-600">
            Nenhuma ESP cadastrada. Cadastre a primeira para adicionar RS.
          </div>
        ) : null}
        <Accordion.Root type="single" collapsible>
          {espData.map((esp) => (
            <Accordion.Item key={esp.id} value={esp.id} className="group border-b-2 border-neutral-200">
              <Accordion.Header className="flex w-full">
                <div
                  className={clsx(
                    "flex w-full items-start transition-all duration-200",
                    espDialogOpen && espDialogMode === "edit" && espForm.id === esp.id
                      ? "border-l-4 border-brand-600 bg-brand-50"
                      : "hover:bg-neutral-50 group-data-[state=open]:border-l-4 group-data-[state=open]:border-blue-500 group-data-[state=open]:bg-blue-50"
                  )}
                >
                  <Accordion.Trigger className="flex flex-1 flex-col px-4 text-left focus:outline-none">
                    <div className="flex w-full items-start gap-3 pb-1 pt-3">
                      <ChevronDown
                        className="mt-1 size-4 shrink-0 text-neutral-400 transition-transform group-data-[state=open]:rotate-180"
                        aria-hidden
                      />
                      <div className="grid flex-1 grid-cols-11 items-start gap-3">
                        <div className="col-span-2">
                          <p className="text-xs uppercase tracking-wide text-neutral-500">ESP</p>
                          <p className="truncate font-semibold text-neutral-900">{esp.code}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs uppercase tracking-wide text-neutral-500">Contrato</p>
                          <p className="truncate font-medium text-neutral-800">{esp.contractNumber}</p>
                        </div>
                        <div className="col-span-5">
                          <p className="text-xs uppercase tracking-wide text-neutral-500">Título</p>
                          <p className="truncate font-medium text-neutral-900">{esp.title}</p>
                        </div>
                        <div className="col-span-2 flex flex-col items-end gap-0.5">
                          <p className="text-xs uppercase tracking-wide text-neutral-500">Valor Total</p>
                          <p className="text-sm font-semibold text-neutral-900">
                            {formatCurrency(esp.value)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="-mt-1 flex items-center gap-2 pb-2 pl-7 text-xs text-neutral-600">
                      <span className="font-medium">Vigência:</span>
                      <span>{formatPeriod(esp.data_inicio, esp.data_fim)}</span>
                    </div>
                  </Accordion.Trigger>

                  <div className="flex min-w-24 flex-col items-end gap-1 pr-4 pt-3">
                    <p className="text-xs uppercase tracking-wide text-neutral-500">Ações</p>
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip.Provider delayDuration={150}>
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <Button
                              size="icon"
                              variant="outline"
                              className="size-8 text-neutral-600 hover:bg-brand-50 hover:text-brand-600"
                              aria-label="Editar ESP"
                              onClick={(e) => {
                                e.preventDefault();
                                openEditEsp(esp.id);
                              }}
                            >
                              <Pencil className="size-5" />
                            </Button>
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Content
                              side="top"
                              sideOffset={6}
                              className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-neutral-900 shadow-lg"
                            >
                              Editar ESP
                              <Tooltip.Arrow className="fill-white" />
                            </Tooltip.Content>
                          </Tooltip.Portal>
                        </Tooltip.Root>
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <Button
                              size="icon"
                              variant="outline"
                              className="size-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                              aria-label="Excluir ESP"
                              onClick={(e) => {
                                e.preventDefault();
                                setConfirmDeleteEspId(esp.id);
                              }}
                              disabled={deletingEspId === esp.id || !supabase}
                            >
                              <Trash2 className="size-5" />
                            </Button>
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Content
                              side="top"
                              sideOffset={6}
                              className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-neutral-900 shadow-lg"
                            >
                              Excluir ESP
                              <Tooltip.Arrow className="fill-white" />
                            </Tooltip.Content>
                          </Tooltip.Portal>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                    </div>
                  </div>
                </div>
              </Accordion.Header>
              <Accordion.Content className="bg-yellow-50 px-4 pb-4">
                <div className="flex items-center justify-between border-b border-neutral-100 py-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">RS vinculadas</p>
                    <p className="text-xs text-neutral-600">
                      Clique em uma linha para editar ou usar o botão abaixo para criar uma nova RS.
                    </p>
                  </div>
                  <Button size="sm" onClick={() => openCreateRs(esp.id)} disabled={!supabase}>
                    <Plus className="mr-2 size-4" />
                    Nova RS
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-neutral-100 text-sm">
                    <thead>
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        <th className="px-2 py-3">RS</th>
                        <th className="px-2 py-3">Título</th>
                        <th className="px-2 py-3">Status</th>
                        <th className="px-2 py-3">Período</th>
                        <th className="px-2 py-3 text-right">Valor</th>
                        <th className="px-2 py-3">Owner Cliente</th>
                        <th className="px-2 py-3">Owner BU</th>
                        <th className="px-2 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-neutral-800">
                      {esp.rsList.map((rs) => (
                        <tr
                          key={rs.id}
                          className={clsx(
                            "hover:bg-white",
                            rsDialogOpen && rsDialogMode === "edit" && activeRsId === rs.id
                              ? "bg-brand-50"
                              : undefined
                          )}
                        >
                          <td className="px-2 py-3 font-semibold text-neutral-900">{rs.code}</td>
                          <td className="px-2 py-3">{rs.title}</td>
                          <td className="px-2 py-3">
                            <span
                              className={clsx(
                                "rounded-full px-2 py-1 text-xs font-semibold uppercase",
                                statusClass[rs.status]
                              )}
                            >
                              {STATUS_LABEL[rs.status]}
                            </span>
                          </td>
                          <td className="px-2 py-3">{rs.period}</td>
                          <td className="px-2 py-3 text-right font-medium text-neutral-900">
                            {formatCurrency(rs.value)}
                          </td>
                          <td className="px-2 py-3">{rs.responsavel_cliente}</td>
                          <td className="px-2 py-3">{rs.responsavel_bu}</td>
                          <td className="px-2 py-3 text-right">
                            <Tooltip.Provider delayDuration={150}>
                              <div className="flex justify-end gap-2">
                                <Tooltip.Root>
                                  <Tooltip.Trigger asChild>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="size-8 text-neutral-600 hover:bg-brand-50 hover:text-brand-600"
                                      aria-label="Editar RS"
                                      onClick={() => openEditRs(esp.id, rs.id)}
                                    >
                                      <Pencil className="size-5" />
                                    </Button>
                                  </Tooltip.Trigger>
                                  <Tooltip.Portal>
                                    <Tooltip.Content
                                      side="top"
                                      sideOffset={6}
                                      className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-neutral-900 shadow-lg"
                                    >
                                      Editar RS
                                      <Tooltip.Arrow className="fill-white" />
                                    </Tooltip.Content>
                                  </Tooltip.Portal>
                                </Tooltip.Root>
                                <Tooltip.Root>
                                  <Tooltip.Trigger asChild>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="size-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                                      aria-label="Excluir RS"
                                      disabled={deletingRsId === rs.id || !supabase}
                                      onClick={() => setConfirmDeleteRsId(rs.id)}
                                    >
                                      <Trash2 className="size-5" />
                                    </Button>
                                  </Tooltip.Trigger>
                                  <Tooltip.Portal>
                                    <Tooltip.Content
                                      side="top"
                                      sideOffset={6}
                                      className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-neutral-900 shadow-lg"
                                    >
                                      Excluir RS
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
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </Card>

      <Dialog.Root open={espDialogOpen} onOpenChange={setEspDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
            <div className="flex items-start justify-between">
              <div>
                <Dialog.Title className="text-lg font-semibold text-neutral-900">
                  {espDialogMode === "create" ? "Nova ESP" : "Editar ESP"}
                </Dialog.Title>
                <Dialog.Description className="text-sm text-neutral-600">
                  Informe o contrato, título e valor total da ESP.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Fechar modal ESP">
                  <X className="size-4" />
                </Button>
              </Dialog.Close>
            </div>
            <form className="mt-4 space-y-4" onSubmit={handleEspSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-neutral-700">Código ESP</label>
                  <input
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    value={espForm.numero_especificacao}
                    onChange={(e) =>
                      setEspForm((prev) => ({ ...prev, numero_especificacao: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-neutral-700">Contrato</label>
                  <select
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                    value={espForm.contrato_id}
                    onChange={(e) => setEspForm((prev) => ({ ...prev, contrato_id: e.target.value }))}
                  >
                    <option value="">Selecione o contrato</option>
                    {contracts.map((contract) => (
                      <option key={contract.id} value={contract.id}>
                        {contract.numero_contrato ?? contract.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">Título</label>
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  value={espForm.titulo}
                  onChange={(e) => setEspForm((prev) => ({ ...prev, titulo: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">Descrição</label>
                <textarea
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  rows={3}
                  value={espForm.descricao}
                  onChange={(e) =>
                    setEspForm((prev) => ({ ...prev, descricao: e.target.value }))
                  }
                  placeholder="Descreva a ESP"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-neutral-700">Início de Vigência</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    value={espForm.data_inicio}
                    onChange={(e) =>
                      setEspForm((prev) => ({ ...prev, data_inicio: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-neutral-700">Fim de Vigência</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    value={espForm.data_fim}
                    onChange={(e) =>
                      setEspForm((prev) => ({ ...prev, data_fim: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">Valor total (R$)</label>
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  value={espForm.valor_total_display}
                  onChange={(e) => {
                    const { raw, display } = normalizeCurrencyInput(e.target.value);
                    setEspForm((prev) => ({ ...prev, valor_total: raw, valor_total_display: display }));
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">Valor comprometido (R$)</label>
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  value={espForm.valor_comprometido_display}
                  onChange={(e) => {
                    const { raw, display } = normalizeCurrencyInput(e.target.value);
                    setEspForm((prev) => ({
                      ...prev,
                      valor_comprometido: raw,
                      valor_comprometido_display: display
                    }));
                  }}
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <Dialog.Close asChild>
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={savingEsp}>
                  {savingEsp
                    ? "Salvando..."
                    : espDialogMode === "create"
                      ? "Salvar ESP"
                      : "Atualizar ESP"}
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={rsDialogOpen} onOpenChange={setRsDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
            <div className="flex items-start justify-between">
              <div>
                <Dialog.Title className="text-lg font-semibold text-neutral-900">
                  {rsDialogMode === "create" ? "Nova RS" : "Editar RS"}
                </Dialog.Title>
                <Dialog.Description className="text-sm text-neutral-600">
                  Relacione a RS a uma ESP e preencha os dados principais.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Fechar modal RS">
                  <X className="size-4" />
                </Button>
              </Dialog.Close>
            </div>
            <form className="mt-4 space-y-4" onSubmit={handleRsSubmit}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">ESP</label>
                <select
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                  defaultValue={selectedEspId ?? ""}
                  value={rsForm.especificacao_id}
                  onChange={(e) => setRsForm((prev) => ({ ...prev, especificacao_id: e.target.value }))}
                >
                  <option value="">Selecione a ESP</option>
                  {espData.map((esp) => (
                    <option key={esp.id} value={esp.id}>
                      {esp.code} · {esp.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-neutral-700">Código RS</label>
                  <input
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    value={rsForm.codigo_rs}
                    onChange={(e) => setRsForm((prev) => ({ ...prev, codigo_rs: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-neutral-700">Período</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    value={rsForm.inicio_planejado}
                    onChange={(e) =>
                      setRsForm((prev) => ({ ...prev, inicio_planejado: e.target.value }))
                    }
                    placeholder="Início planejado"
                  />
                  <input
                    type="date"
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    value={rsForm.fim_planejado}
                    onChange={(e) =>
                      setRsForm((prev) => ({ ...prev, fim_planejado: e.target.value }))
                    }
                    placeholder="Fim planejado"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">Título</label>
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  value={rsForm.titulo}
                  onChange={(e) => setRsForm((prev) => ({ ...prev, titulo: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">Valor Total (R$)</label>
                <input
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  value={rsForm.valor_total_display}
                  onChange={(e) => {
                    const { raw, display } = normalizeCurrencyInput(e.target.value);
                    setRsForm((prev) => ({ ...prev, valor_total: raw, valor_total_display: display }));
                  }}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-neutral-700">Responsável Cliente</label>
                  <input
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    value={rsForm.responsavel_cliente}
                    onChange={(e) =>
                      setRsForm((prev) => ({ ...prev, responsavel_cliente: e.target.value }))
                    }
                    placeholder="Resp. cliente"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-neutral-700">Responsável BU</label>
                  <input
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    value={rsForm.responsavel_bu}
                    onChange={(e) =>
                      setRsForm((prev) => ({ ...prev, responsavel_bu: e.target.value }))
                    }
                    placeholder="Resp. BU"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">Status</label>
                <select
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                  value={rsForm.status}
                  onChange={(e) => setRsForm((prev) => ({ ...prev, status: e.target.value as RSStatus }))}
                >
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <Dialog.Close asChild>
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={savingRs}>
                  {savingRs
                    ? "Salvando..."
                    : rsDialogMode === "create"
                      ? "Salvar RS"
                      : "Atualizar RS"}
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={Boolean(confirmDeleteEspId)}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteEspId(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
            <Dialog.Title className="text-lg font-semibold text-neutral-900">Excluir ESP</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-neutral-600">
              Confirma a exclusão desta ESP? As RS vinculadas serão removidas.
            </Dialog.Description>
            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close asChild>
                <Button variant="outline" type="button" onClick={() => setConfirmDeleteEspId(null)}>
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button
                variant="destructive"
                type="button"
                onClick={() => confirmDeleteEspId && void handleEspDelete(confirmDeleteEspId)}
                disabled={deletingEspId === confirmDeleteEspId}
              >
                {deletingEspId === confirmDeleteEspId ? "Excluindo..." : "Excluir"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={Boolean(confirmDeleteRsId)}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteRsId(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
            <Dialog.Title className="text-lg font-semibold text-neutral-900">Excluir RS</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-neutral-600">
              Confirma a exclusão desta RS?
            </Dialog.Description>
            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close asChild>
                <Button variant="outline" type="button" onClick={() => setConfirmDeleteRsId(null)}>
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button
                variant="destructive"
                type="button"
                onClick={() => confirmDeleteRsId && void handleRsDelete(confirmDeleteRsId)}
                disabled={deletingRsId === confirmDeleteRsId}
              >
                {deletingRsId === confirmDeleteRsId ? "Excluindo..." : "Excluir"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
