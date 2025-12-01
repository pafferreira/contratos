"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronDown, Pencil, Plus, Trash2, X } from "lucide-react";
import clsx from "clsx";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type RSRow = {
  id: string;
  especificacao_id: string | null;
  codigo_rs: string | null;
  titulo: string | null;
  status: string | null;
  inicio_planejado: string | null;
  fim_planejado: string | null;
  percentual_conclusao: number | null;
  responsavel_cliente: string | null;
  responsavel_bu: string | null;
  especificacao?: { numero_especificacao: string | null; titulo: string | null } | null;
  metricas?: MetricRow[] | null;
};

type MetricRow = {
  id: string;
  solicitacao_id: string | null;
  tipo_metrica: string | null;
  quantidade: number | null;
  horas_unidade: number | null;
  taxa: number | null;
  valor_total: number | null;
};

type ProfileRow = {
  id: string;
  nome: string;
  valor_hora: number;
};

type RSRecord = RSRow & {
  metricasList: MetricRow[];
};

type ProjectFormState = {
  tipo_metrica: string;
  quantidade: string;
  horas_unidade: string;
  taxa: string;
  taxa_display: string;
  perfil_id: string;
};

type ProjectFormErrors = Partial<Record<keyof ProjectFormState, string>> & { general?: string };

const EMPTY_FORM: ProjectFormState = {
  tipo_metrica: "USH",
  quantidade: "",
  horas_unidade: "",
  taxa: "",
  taxa_display: "",
  perfil_id: ""
};

const METRIC_TYPES = [
  { value: "USH", label: "USH" },
  { value: "USD", label: "USD" },
  { value: "PF", label: "PF" },
  { value: "PARCELA_FIXA", label: "Parcela fixa" }
] as const;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const formatCurrency = (value?: number | null) =>
  typeof value === "number" && !Number.isNaN(value) ? currencyFormatter.format(value) : "—";

const normalizeCurrencyInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return { raw: "", display: "" };
  const numeric = (Number(digits) / 100).toFixed(2);
  return {
    raw: numeric,
    display: currencyFormatter.format(Number(numeric))
  };
};

const formatDateRange = (start?: string | null, end?: string | null) => {
  if (!start && !end) return "Período não informado";
  if (start && end) return `${start} - ${end}`;
  return start ? `${start} - ?` : `? - ${end}`;
};

const calcTotal = (form: ProjectFormState) => {
  const quantity = Number(form.quantidade.replace(",", ".")) || 0;
  const hours = Number(form.horas_unidade.replace(",", ".")) || 0;
  const rate = Number(form.taxa.replace(",", ".")) || 0;
  return quantity * hours * rate;
};

export default function ProjetosPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [rsList, setRsList] = useState<RSRecord[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pjDialogOpen, setPjDialogOpen] = useState(false);
  const [pjDialogMode, setPjDialogMode] = useState<"create" | "edit">("create");
  const [pjForm, setPjForm] = useState<ProjectFormState>({ ...EMPTY_FORM });
  const [pjFormErrors, setPjFormErrors] = useState<ProjectFormErrors>({});
  const [pjSubmitting, setPjSubmitting] = useState(false);
  const [activePjId, setActivePjId] = useState<string | null>(null);
  const [activeRsId, setActiveRsId] = useState<string | null>(null);

  const [confirmDeletePjId, setConfirmDeletePjId] = useState<string | null>(null);
  const [deletingPjId, setDeletingPjId] = useState<string | null>(null);
  const [pjActionError, setPjActionError] = useState<string | null>(null);

  const profilesMap = useMemo(() => {
    const map = new Map<string, ProfileRow>();
    profiles.forEach((p) => p.id && map.set(p.id, p));
    return map;
  }, [profiles]);

  const totalFromForm = useMemo(() => calcTotal(pjForm), [pjForm]);

  const loadProfiles = useCallback(async () => {
    if (!supabase) return;
    const { data, error: fetchError } = await (supabase as any)
      .from("C_PERFIS_RECURSOS")
      .select("id, nome, valor_hora")
      .order("nome", { ascending: true });
    if (fetchError) {
      setError("Erro ao carregar perfis.");
      return;
    }
    setProfiles((data || []) as ProfileRow[]);
  }, [supabase]);

  const loadProjects = useCallback(async () => {
    if (!supabase) {
      setError("Supabase não configurado.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setError(null);
    const { data, error: fetchError } = await (supabase as any)
      .from("C_REQUISICOES_SERVICO")
      .select(
        `
        id,
        especificacao_id,
        codigo_rs,
        titulo,
        status,
        inicio_planejado,
        fim_planejado,
        percentual_conclusao,
        responsavel_cliente,
        responsavel_bu,
        especificacao:C_ESPECIFICACOES_SERVICO ( numero_especificacao, titulo ),
        metricas:C_METRICAS_SOLICITACAO (*)
      `
      )
      .order("codigo_rs", { ascending: true });

    if (fetchError) {
      setError("Erro ao carregar RS.");
      setRsList([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const rows = (data || []) as RSRow[];
    const mapped: RSRecord[] = rows.map((row) => {
      const metricas = row.metricas ?? [];
      return {
        ...row,
        metricasList: metricas.map((m) => ({
          id: m.id,
          solicitacao_id: m.solicitacao_id,
          tipo_metrica: m.tipo_metrica,
          quantidade: m.quantidade,
          horas_unidade: m.horas_unidade,
          taxa: m.taxa,
          valor_total: m.valor_total
        }))
      };
    });

    setRsList(mapped);
    setLoading(false);
    setRefreshing(false);
  }, [supabase]);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProjects(), loadProfiles()]);
    setRefreshing(false);
  };

  useEffect(() => {
    void refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = useCallback(() => {
    setPjForm({ ...EMPTY_FORM });
    setPjFormErrors({});
    setActivePjId(null);
    setActiveRsId(null);
    setPjActionError(null);
    setPjDialogMode("create");
  }, []);

  const handleFormChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    if (name === "taxa") {
      const { raw, display } = normalizeCurrencyInput(value);
      setPjForm((prev) => ({ ...prev, taxa: raw, taxa_display: display }));
      return;
    }

    if (name === "perfil_id") {
      const profile = profilesMap.get(value);
      setPjForm((prev) => ({
        ...prev,
        perfil_id: value,
        taxa: profile ? String(profile.valor_hora) : prev.taxa,
        taxa_display: profile ? formatCurrency(profile.valor_hora) : prev.taxa_display
      }));
      return;
    }

    setPjForm((prev) => ({ ...prev, [name]: value }));
  };

  const openCreateProject = (rs: RSRecord) => {
    resetForm();
    setActiveRsId(rs.id);
    setPjDialogMode("create");
    setPjDialogOpen(true);
  };

  const openEditProject = (rs: RSRecord, metric: MetricRow) => {
    resetForm();
    setActiveRsId(rs.id);
    setActivePjId(metric.id);
    setPjDialogMode("edit");
    const matchedProfile = profiles.find(
      (p) => p.valor_hora === (metric.taxa ?? undefined)
    );
    setPjForm({
      tipo_metrica: metric.tipo_metrica ?? "USH",
      quantidade: metric.quantidade?.toString() ?? "",
      horas_unidade: metric.horas_unidade?.toString() ?? "",
      taxa: metric.taxa?.toString() ?? "",
      taxa_display: formatCurrency(metric.taxa),
      perfil_id: matchedProfile?.id ?? ""
    });
    setPjDialogOpen(true);
  };

  const handleSubmitProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPjFormErrors({});
    setPjActionError(null);

    if (!activeRsId) {
      setPjActionError("Selecione uma RS para vincular o projeto.");
      return;
    }

    const quantity = Number(pjForm.quantidade.replace(",", "."));
    const hours = Number(pjForm.horas_unidade.replace(",", "."));
    const rate = Number(pjForm.taxa.replace(",", "."));

    if (Number.isNaN(quantity) || quantity <= 0) {
      setPjFormErrors({ quantidade: "Informe uma quantidade válida" });
      return;
    }
    if (Number.isNaN(hours) || hours < 0) {
      setPjFormErrors({ horas_unidade: "Informe horas válidas" });
      return;
    }
    if (Number.isNaN(rate) || rate <= 0) {
      setPjFormErrors({ taxa: "Informe uma taxa válida" });
      return;
    }

    const payload = {
      solicitacao_id: activeRsId,
      tipo_metrica: pjForm.tipo_metrica,
      quantidade: quantity,
      horas_unidade: hours,
      taxa: rate,
      valor_total: quantity * hours * rate
    };

    setPjSubmitting(true);

    const query = (supabase as any).from("C_METRICAS_SOLICITACAO");
    const response =
      pjDialogMode === "edit" && activePjId
        ? await query.update(payload).eq("id", activePjId)
        : await query.insert(payload);

    setPjSubmitting(false);

    if (response.error) {
      setPjFormErrors({
        general: response.error.message ?? "Erro ao salvar o projeto."
      });
      return;
    }

    setPjDialogOpen(false);
    resetForm();
    await loadProjects();
  };

  const openDeleteProject = (metric: MetricRow) => {
    setConfirmDeletePjId(metric.id ?? null);
    setPjActionError(null);
  };

  const handleDeleteProject = async () => {
    if (!confirmDeletePjId) return;
    if (!supabase) return;
    setDeletingPjId(confirmDeletePjId);
    const { error: deleteErr } = await (supabase as any)
      .from("C_METRICAS_SOLICITACAO")
      .delete()
      .eq("id", confirmDeletePjId);
    setDeletingPjId(null);

    if (deleteErr) {
      setPjActionError(deleteErr.message ?? "Erro ao excluir o projeto.");
      return;
    }

    setConfirmDeletePjId(null);
    await loadProjects();
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Card>
          <p className="text-sm text-neutral-500">Carregando projetos...</p>
        </Card>
      );
    }

    if (rsList.length === 0) {
      return (
        <Card>
          <p className="text-sm text-neutral-500">Nenhuma RS encontrada.</p>
        </Card>
      );
    }

    return (
      <Accordion.Root type="single" collapsible className="space-y-3">
        {rsList.map((rs) => {
          const percent = rs.percentual_conclusao ?? 0;
          const metrics = rs.metricasList ?? [];

          return (
            <Accordion.Item
              key={rs.id}
              value={rs.id}
              className="overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-sm"
            >
              <Accordion.Header>
                <Accordion.Trigger className="group flex w-full items-start justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-neutral-50 data-[state=open]:border-b data-[state=open]:border-neutral-100">
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-neutral-900">
                        {rs.codigo_rs ?? "RS sem código"}
                      </h2>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                        {rs.titulo ?? "Título não informado"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-600">
                      <span>Status: {rs.status ?? "Sem status"}</span>
                      <span>Período: {formatDateRange(rs.inicio_planejado, rs.fim_planejado)}</span>
                      {typeof percent === "number" ? <span>Concluído: {percent}%</span> : null}
                      {rs.especificacao?.numero_especificacao ? (
                        <span>ESP: {rs.especificacao.numero_especificacao}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          openCreateProject(rs);
                        }}
                      >
                        <Plus className="mr-2 size-4" />
                        Novo Projeto
                      </Button>
                    </div>
                    <ChevronDown className="size-5 text-neutral-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </div>
                </Accordion.Trigger>
              </Accordion.Header>

              <Accordion.Content className="border-t border-neutral-100 bg-white">
                <div className="space-y-3 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Projetos</p>
                      <p className="text-xs text-neutral-500">
                        Métricas vinculadas a esta requisição de serviço.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        openCreateProject(rs);
                      }}
                    >
                      <Plus className="mr-2 size-4" />
                      Novo Projeto
                    </Button>
                  </div>

                  {metrics.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
                      Nenhuma métrica cadastrada para esta RS.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-neutral-100 text-sm">
                        <thead className="bg-neutral-50 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                          <tr>
                            <th className="px-3 py-2">Tipo</th>
                            <th className="px-3 py-2">Perfil (taxa)</th>
                            <th className="px-3 py-2">Quantidade</th>
                            <th className="px-3 py-2">Horas/un.</th>
                            <th className="px-3 py-2">Valor unit.</th>
                            <th className="px-3 py-2">Total</th>
                            <th className="px-3 py-2 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 text-neutral-700">
                          {metrics.map((metric) => {
                            const profileMatch = profiles.find(
                              (p) => Number(p.valor_hora) === Number(metric.taxa ?? 0)
                            );
                            return (
                              <tr key={metric.id}>
                                <td className="px-3 py-2 font-semibold text-neutral-900">
                                  {metric.tipo_metrica ?? "—"}
                                </td>
                                <td className="px-3 py-2">
                                  {profileMatch ? profileMatch.nome : "—"}{" "}
                                  <span className="text-xs text-neutral-500">
                                    ({formatCurrency(metric.taxa)})
                                  </span>
                                </td>
                                <td className="px-3 py-2">{metric.quantidade ?? "-"}</td>
                                <td className="px-3 py-2">{metric.horas_unidade ?? "-"}</td>
                                <td className="px-3 py-2">{formatCurrency(metric.taxa)}</td>
                                <td className="px-3 py-2 font-semibold text-neutral-900">
                                  {formatCurrency(metric.valor_total)}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      type="button"
                                      onClick={() => openEditProject(rs, metric)}
                                    >
                                      <Pencil className="mr-2 size-4" />
                                      Editar
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      type="button"
                                      className="text-danger"
                                      onClick={() => openDeleteProject(metric)}
                                      aria-label="Excluir"
                                    >
                                      <Trash2 className="size-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </Accordion.Content>
            </Accordion.Item>
          );
        })}
      </Accordion.Root>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projetos"
        subtitle="Visualize RS e cadastre métricas/projetos associados."
        actions={
          <Button variant="secondary" size="sm" onClick={refresh} disabled={refreshing}>
            {refreshing ? "Atualizando..." : "Atualizar dados"}
          </Button>
        }
      />

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {renderContent()}

      <Dialog.Root open={pjDialogOpen} onOpenChange={setPjDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <Dialog.Title className="text-lg font-semibold text-neutral-900">
                  {pjDialogMode === "create" ? "Novo Projeto" : "Editar Projeto"}
                </Dialog.Title>
                <Dialog.Description className="text-sm text-neutral-500">
                  Defina métricas vinculadas à RS selecionada.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100"
                  aria-label="Fechar modal de projeto"
                  onClick={resetForm}
                >
                  <X className="size-4" />
                </button>
              </Dialog.Close>
            </div>

            {pjFormErrors.general ? (
              <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {pjFormErrors.general}
              </div>
            ) : null}

            <form className="space-y-4" onSubmit={handleSubmitProject}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-neutral-700" htmlFor="tipo_metrica">
                    Tipo de métrica
                  </label>
                  <select
                    id="tipo_metrica"
                    name="tipo_metrica"
                    value={pjForm.tipo_metrica}
                    onChange={handleFormChange}
                    className={clsx(
                      "mt-2 w-full rounded-lg border px-3 py-2 text-sm",
                      pjFormErrors.tipo_metrica ? "border-danger" : "border-neutral-200"
                    )}
                  >
                    {METRIC_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {pjFormErrors.tipo_metrica ? (
                    <p className="mt-1 text-xs text-danger">{pjFormErrors.tipo_metrica}</p>
                  ) : null}
                </div>

                <div>
                  <label className="text-sm font-medium text-neutral-700" htmlFor="perfil_id">
                    Perfil (define a taxa)
                  </label>
                  <select
                    id="perfil_id"
                    name="perfil_id"
                    value={pjForm.perfil_id}
                    onChange={handleFormChange}
                    className={clsx(
                      "mt-2 w-full rounded-lg border px-3 py-2 text-sm",
                      pjFormErrors.perfil_id ? "border-danger" : "border-neutral-200"
                    )}
                  >
                    <option value="">Selecione o perfil</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.nome} — {formatCurrency(profile.valor_hora)}
                      </option>
                    ))}
                  </select>
                  {pjFormErrors.perfil_id ? (
                    <p className="mt-1 text-xs text-danger">{pjFormErrors.perfil_id}</p>
                  ) : (
                    <p className="mt-1 text-xs text-neutral-500">
                      A taxa será preenchida com o valor hora do perfil escolhido.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-neutral-700" htmlFor="quantidade">
                    Quantidade
                  </label>
                  <input
                    id="quantidade"
                    name="quantidade"
                    type="number"
                    step="any"
                    value={pjForm.quantidade}
                    onChange={handleFormChange}
                    className={clsx(
                      "mt-2 w-full rounded-lg border px-3 py-2 text-sm",
                      pjFormErrors.quantidade ? "border-danger" : "border-neutral-200"
                    )}
                  />
                  {pjFormErrors.quantidade ? (
                    <p className="mt-1 text-xs text-danger">{pjFormErrors.quantidade}</p>
                  ) : null}
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700" htmlFor="horas_unidade">
                    Horas por unidade
                  </label>
                  <input
                    id="horas_unidade"
                    name="horas_unidade"
                    type="number"
                    step="any"
                    value={pjForm.horas_unidade}
                    onChange={handleFormChange}
                    className={clsx(
                      "mt-2 w-full rounded-lg border px-3 py-2 text-sm",
                      pjFormErrors.horas_unidade ? "border-danger" : "border-neutral-200"
                    )}
                  />
                  {pjFormErrors.horas_unidade ? (
                    <p className="mt-1 text-xs text-danger">{pjFormErrors.horas_unidade}</p>
                  ) : null}
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-700" htmlFor="taxa">
                    Taxa (valor hora)
                  </label>
                  <input
                    id="taxa"
                    name="taxa"
                    type="text"
                    inputMode="decimal"
                    value={pjForm.taxa_display}
                    onChange={handleFormChange}
                    className={clsx(
                      "mt-2 w-full rounded-lg border px-3 py-2 text-sm",
                      pjFormErrors.taxa ? "border-danger" : "border-neutral-200"
                    )}
                  />
                  {pjFormErrors.taxa ? (
                    <p className="mt-1 text-xs text-danger">{pjFormErrors.taxa}</p>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-neutral-800">Total estimado</p>
                  <p className="text-xs text-neutral-500">
                    Quantidade x horas por unidade x taxa
                  </p>
                </div>
                <p className="text-lg font-semibold text-neutral-900">
                  {formatCurrency(totalFromForm)}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Dialog.Close asChild>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={pjSubmitting}>
                  {pjSubmitting
                    ? "Salvando..."
                    : pjDialogMode === "create"
                      ? "Criar projeto"
                      : "Atualizar projeto"}
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={Boolean(confirmDeletePjId)}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDeletePjId(null);
            setPjActionError(null);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
            <Dialog.Title className="text-lg font-semibold text-neutral-900">
              Excluir projeto
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-neutral-600">
              Confirma a exclusão desta métrica/projeto? Essa ação não pode ser desfeita.
            </Dialog.Description>

            {pjActionError ? (
              <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {pjActionError}
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close asChild>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setConfirmDeletePjId(null);
                    setPjActionError(null);
                  }}
                >
                  Cancelar
                </Button>
              </Dialog.Close>
              <Button
                variant="destructive"
                type="button"
                onClick={handleDeleteProject}
                disabled={!confirmDeletePjId || deletingPjId === confirmDeletePjId}
              >
                {deletingPjId === confirmDeletePjId ? "Excluindo..." : "Excluir"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
