"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Activity, BarChart3, Camera, ChevronLeft, ChevronRight, Flame, MessageCircle, Pencil, Save, Settings, Timer, Trash2, X } from "lucide-react";
import dateUtils from "../lib/date.js";
import tabUtils from "../lib/ui/tabs.js";
import chatPresentation from "../lib/chat/presentation.js";
import analyticsActions from "../lib/analytics/item-actions.js";

type TabKey = "chat" | "analytics" | "profile";

type ChatAttachment = {
  id: number;
  url: string;
  original_name?: string;
  mime_type?: string;
};

type ChatMessage = {
  id: number | string;
  role: "user" | "assistant";
  message_type: string;
  text: string;
  status: string;
  confidence?: number | null;
  metadata?: any;
  attachments?: ChatAttachment[];
  linked_records?: Array<{ record_type: string; record_id: string; link_type: string }>;
  created_at: string;
};

type AnalyticsData = {
  summary: { kcal: number; protein: number; carbs: number; fat: number };
  goals: { calories: number; protein: number; carbs: number; fat: number };
  workouts: { total: number; duration: number; count: number };
  history: Array<{ day: string; kcal: number; protein: number; workouts_kcal: number; net_kcal: number }>;
  items: Array<any>;
};

const { getTodayInTimezone, shiftDate } = dateUtils as {
  getTodayInTimezone: (now?: Date | string, timeZone?: string) => string;
  shiftDate: (date: string, delta: number) => string;
};

const { TAB_STORAGE_KEY, getStoredTab } = tabUtils as {
  TAB_STORAGE_KEY: string;
  getStoredTab: (storage: Storage | null | undefined) => TabKey;
};

const { describeResult, buildPendingMessages } = chatPresentation as {
  describeResult: (result: any) => string | null;
  buildPendingMessages: (input: { text?: string; attachments?: ChatAttachment[] }) => { userMessage: ChatMessage; waitingMessage: ChatMessage };
};

const { getItemResource, buildEditPayload, buildDeleteCopy } = analyticsActions as {
  getItemResource: (item: any) => { itemType: "meal" | "workout"; recordId: number; endpoint: string };
  buildEditPayload: (item: any) => any;
  buildDeleteCopy: (item: any) => string;
};

const tabs: Array<{ key: TabKey; label: string; icon: React.ComponentType<any> }> = [
  { key: "chat", label: "Chat", icon: MessageCircle },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "profile", label: "Profile", icon: Settings },
];

function formatConfidence(value?: number | null) {
  if (typeof value !== "number") return null;
  return `${Math.round(value * 100)}%`;
}

function macroProgress(value: number, goal: number) {
  if (!goal) return 0;
  return Math.max(0, Math.min(100, Math.round((value / goal) * 100)));
}

function formatDayLabel(day: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${day}T12:00:00-03:00`));
}

function formatTimeLabel(loggedAt?: string) {
  if (!loggedAt) return "--:--";
  const normalized = String(loggedAt).replace(" ", "T");
  const suffix = normalized.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(normalized) ? "" : "-03:00";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${normalized}${suffix}`));
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    if (typeof window === "undefined") return "chat";
    return getStoredTab(window.sessionStorage);
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [stagedAttachments, setStagedAttachments] = useState<ChatAttachment[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => getTodayInTimezone(new Date(), "America/Sao_Paulo"));
  const [goals, setGoals] = useState({ calories: 2500, protein: 200, carbs: 270, fat: 70 });
  const [preferences, setPreferences] = useState({ parserMode: "balanced", imageRetentionDays: 180 });
  const [savingProfile, setSavingProfile] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null);
  const [confirmingMessageId, setConfirmingMessageId] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editingDraft, setEditingDraft] = useState<any | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const netCalories = useMemo(() => {
    if (!analytics) return 0;
    return Number(analytics.summary?.kcal || 0) - Number(analytics.workouts?.total || 0);
  }, [analytics]);

  const displayedMessages = useMemo(() => [...messages, ...pendingMessages], [messages, pendingMessages]);

  async function loadThread() {
    const response = await fetch("/api/chat/thread", { cache: "no-store" });
    const payload = await response.json();
    if (payload.messages) {
      setMessages(payload.messages);
    }
  }

  async function loadAnalytics(date = selectedDate) {
    const response = await fetch(`/api/data?date=${date}`, { cache: "no-store" });
    const payload = await response.json();
    setAnalytics(payload);
  }

  async function loadProfile() {
    const [goalsRes, prefRes] = await Promise.all([
      fetch("/api/goals", { cache: "no-store" }),
      fetch("/api/preferences", { cache: "no-store" }),
    ]);
    const goalsPayload = await goalsRes.json();
    const prefPayload = await prefRes.json();
    if (!goalsPayload.error) setGoals(goalsPayload);
    if (!prefPayload.error) setPreferences(prefPayload);
  }

  useEffect(() => {
    loadThread();
    loadAnalytics(selectedDate);
    loadProfile();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(TAB_STORAGE_KEY, activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    loadAnalytics(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTab]);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (payload.attachment) {
        setStagedAttachments((current) => [...current, payload.attachment]);
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleSend() {
    if (!text.trim() && stagedAttachments.length === 0) return;

    const textToSend = text;
    const attachmentsToSend = [...stagedAttachments];
    const optimistic = buildPendingMessages({
      text: textToSend,
      attachments: attachmentsToSend,
    });

    setPendingMessages([optimistic.userMessage, optimistic.waitingMessage]);
    setText("");
    setStagedAttachments([]);
    setSending(true);
    setSubmissionFeedback("Mensagem enviada. Estou analisando...");
    try {
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSend,
          attachmentIds: attachmentsToSend.map((attachment) => attachment.id),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Não consegui registrar agora.");
      }
      if (payload.messages) {
        setMessages(payload.messages);
        setPendingMessages([]);
        setSubmissionFeedback(describeResult(payload.result) || "Registro atualizado.");
        await loadAnalytics(selectedDate);
      }
    } catch (error: any) {
      setPendingMessages([]);
      setText(textToSend);
      setStagedAttachments(attachmentsToSend);
      setSubmissionFeedback(error.message || "Não consegui registrar agora.");
    } finally {
      setSending(false);
    }
  }

  async function handleConfirmDraft(messageId: number) {
    setConfirmingMessageId(messageId);
    setSubmissionFeedback("Salvando rascunho...");
    try {
      const response = await fetch(`/api/chat/messages/${messageId}/confirm`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Não consegui salvar esse rascunho.");
      }
      if (payload.messages) {
        setMessages(payload.messages);
        setSubmissionFeedback("Rascunho salvo com sucesso.");
        await loadAnalytics(selectedDate);
      }
    } catch (error: any) {
      setSubmissionFeedback(error.message || "Não consegui salvar esse rascunho.");
    } finally {
      setConfirmingMessageId(null);
    }
  }

  async function saveProfile() {
    setSavingProfile(true);
    try {
      await Promise.all([
        fetch("/api/goals", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(goals),
        }),
        fetch("/api/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(preferences),
        }),
      ]);
      await loadAnalytics(selectedDate);
    } finally {
      setSavingProfile(false);
    }
  }

  function openEditItem(item: any) {
    setEditingItem(item);
    setEditingDraft(buildEditPayload(item));
  }

  function closeEditItem() {
    if (savingItem) return;
    setEditingItem(null);
    setEditingDraft(null);
  }

  async function handleSaveItem() {
    if (!editingItem || !editingDraft) return;
    const { endpoint, itemType } = getItemResource(editingItem);

    setSavingItem(true);
    setSubmissionFeedback(itemType === "workout" ? "Salvando treino..." : "Salvando refeição...");
    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingDraft),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Não consegui salvar essa edição.");
      }
      await loadAnalytics(selectedDate);
      setSubmissionFeedback(itemType === "workout" ? "Treino atualizado." : "Refeição atualizada.");
      setEditingItem(null);
      setEditingDraft(null);
    } catch (error: any) {
      setSubmissionFeedback(error.message || "Não consegui salvar essa edição.");
    } finally {
      setSavingItem(false);
    }
  }

  async function handleDeleteItem(item: any) {
    const confirmed = window.confirm(buildDeleteCopy(item));
    if (!confirmed) return;

    const { endpoint, itemType } = getItemResource(item);
    setDeletingItemId(item.id);
    setSubmissionFeedback(itemType === "workout" ? "Apagando treino..." : "Apagando refeição...");
    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Não consegui apagar esse registro.");
      }
      await loadAnalytics(selectedDate);
      setSubmissionFeedback(itemType === "workout" ? "Treino apagado." : "Refeição apagada.");
      if (editingItem?.id === item.id) {
        setEditingItem(null);
        setEditingDraft(null);
      }
    } catch (error: any) {
      setSubmissionFeedback(error.message || "Não consegui apagar esse registro.");
    } finally {
      setDeletingItemId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#0b141a] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#111b21]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 pb-3 pt-4 lg:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">Diet Tracker</p>
            <h1 className="text-lg font-semibold">Matheusinho</h1>
          </div>
          <div className="hidden lg:flex items-center gap-2 rounded-full bg-white/5 p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={`header-${tab.key}`}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm ${active ? "bg-white/10 text-emerald-300" : "text-white/55"}`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <section className="mx-auto flex max-w-6xl flex-1 overflow-y-auto pb-24 lg:px-6 lg:pb-8">
        {activeTab === "chat" && (
          <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-[url('/chat-bg.svg')] bg-cover bg-center px-3 py-4 lg:rounded-[32px]">
            <div className="space-y-3">
              {displayedMessages.map((message) => {
                const isUser = message.role === "user";
                const normalized = message.metadata?.normalized;
                const isWaiting = message.message_type === "pending";
                const isOptimistic = Boolean(message.metadata?.optimistic);
                return (
                  <div key={String(message.id)} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[88%] rounded-2xl px-3 py-2 shadow ${isUser ? "bg-[#005c4b]" : "bg-[#202c33]"} ${isOptimistic ? "opacity-90" : ""}`}>
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mb-2 grid grid-cols-2 gap-2">
                          {message.attachments.map((attachment) => (
                            <img key={attachment.id} src={attachment.url} alt={attachment.original_name || "attachment"} className="h-28 w-full rounded-xl object-cover" />
                          ))}
                        </div>
                      )}
                      {isWaiting ? (
                        <div className="flex items-center gap-2 text-sm text-white/90">
                          <span>{message.text}</span>
                          <span className="inline-flex gap-1">
                            <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-300 [animation-delay:-0.2s]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-300 [animation-delay:-0.1s]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-300" />
                          </span>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm leading-6 text-white">{message.text}</p>
                      )}
                      {!isUser && normalized && (
                        <div className="mt-2 rounded-xl bg-black/20 p-2 text-xs text-white/80">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium uppercase tracking-wide">{normalized.action}</span>
                            {formatConfidence(message.confidence) && <span>{formatConfidence(message.confidence)}</span>}
                          </div>
                          {normalized.description && <p className="mt-1">{normalized.description}</p>}
                          {normalized.modality && <p className="mt-1">{normalized.modality}</p>}
                          {typeof normalized.calories === "number" && <p>🔥 {normalized.calories} kcal</p>}
                          {typeof normalized.protein === "number" && <p>🥩 {normalized.protein}g proteína</p>}
                          {typeof normalized.carbs === "number" && <p>🍞 {normalized.carbs}g carbo</p>}
                          {typeof normalized.fat === "number" && <p>🥑 {normalized.fat}g gordura</p>}
                          {message.message_type === "draft" && (
                            <button
                              onClick={() => handleConfirmDraft(Number(message.id))}
                              disabled={confirmingMessageId === Number(message.id)}
                              className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-400 px-3 py-1 font-medium text-[#0b141a] disabled:opacity-60"
                            >
                              <Save className="h-3.5 w-3.5" />
                              {confirmingMessageId === Number(message.id) ? "Salvando..." : "Salvar esse rascunho"}
                            </button>
                          )}
                        </div>
                      )}
                      <div className="mt-1 flex justify-end text-[11px] text-white/55">
                        {message.status}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {stagedAttachments.length > 0 && (
              <div className="mt-4 rounded-2xl bg-[#202c33] p-3">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-white/60">Pronto para enviar</div>
                <div className="grid grid-cols-3 gap-2">
                  {stagedAttachments.map((attachment) => (
                    <img key={attachment.id} src={attachment.url} alt={attachment.original_name || "staged"} className="h-20 w-full rounded-xl object-cover" />
                  ))}
                </div>
              </div>
            )}

            {submissionFeedback && (
              <div className="mt-4 rounded-2xl bg-black/30 px-3 py-2 text-sm text-emerald-100">
                {submissionFeedback}
              </div>
            )}
          </div>
        )}

        {activeTab === "analytics" && analytics && (
          <div className="w-full space-y-4 px-4 py-4 lg:px-0">
            <div className="flex items-center justify-between rounded-2xl bg-[#111b21] p-3 lg:px-5">
              <button onClick={() => setSelectedDate((value) => shiftDate(value, -1))} className="rounded-full bg-white/5 p-2">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-center">
                <div className="text-xs uppercase tracking-wide text-white/50">Data</div>
                <div className="font-medium">{selectedDate}</div>
              </div>
              <button onClick={() => setSelectedDate((value) => shiftDate(value, 1))} className="rounded-full bg-white/5 p-2">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <MetricCard icon={Flame} label="Consumido" value={`${analytics.summary?.kcal || 0} kcal`} tone="emerald" />
                  <MetricCard icon={Activity} label="Líquido" value={`${netCalories} kcal`} tone="blue" />
                  <MetricCard icon={Timer} label="Treino" value={`${analytics.workouts?.total || 0} kcal`} tone="amber" />
                  <MetricCard icon={BarChart3} label="Sessões" value={`${analytics.workouts?.count || 0}`} tone="purple" />
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.95fr)]">
                  <div className="rounded-3xl bg-[#111b21] p-4">
                    <h2 className="mb-3 text-sm font-semibold text-white/85">Macros</h2>
                    <MacroBar label="Proteína" value={analytics.summary?.protein || 0} goal={analytics.goals?.protein || 1} color="bg-emerald-400" />
                    <MacroBar label="Carbo" value={analytics.summary?.carbs || 0} goal={analytics.goals?.carbs || 1} color="bg-sky-400" />
                    <MacroBar label="Gordura" value={analytics.summary?.fat || 0} goal={analytics.goals?.fat || 1} color="bg-amber-400" />
                  </div>

                  <div className="rounded-3xl bg-[#111b21] p-4">
                    <h2 className="mb-3 text-sm font-semibold text-white/85">Últimos 7 dias</h2>
                    <div className="space-y-3">
                      {analytics.history?.slice(0, 7).map((day) => (
                        <div key={day.day}>
                          <div className="mb-1 flex items-center justify-between text-xs text-white/65">
                            <span>{formatDayLabel(day.day)}</span>
                            <span>{day.net_kcal} kcal líquido</span>
                          </div>
                          <div className="h-2 rounded-full bg-white/10">
                            <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${Math.min(100, Math.max(8, (Number(day.protein || 0) / (analytics.goals?.protein || 200)) * 100))}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-[#111b21] p-4">
                <h2 className="mb-3 text-sm font-semibold text-white/85">Timeline do dia</h2>
                <div className="space-y-2 lg:hidden">
                  {analytics.items?.length ? analytics.items.map((item: any) => (
                    <div key={item.id} className="rounded-2xl bg-white/5 p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span>{item.description}</span>
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/55">
                              {item.type === "workout" ? "Treino" : "Refeição"}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-white/55">
                            {item.type === "workout"
                              ? `${item.amount || 0} min • ${item.calories} kcal`
                              : `${item.amount || 0}${item.unit || "g"} • ${item.calories} kcal`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditItem(item)}
                            className="rounded-full bg-white/10 p-2 text-white/70"
                            aria-label={`Editar ${item.description}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item)}
                            disabled={deletingItemId === item.id}
                            className="rounded-full bg-white/10 p-2 text-red-300 disabled:opacity-60"
                            aria-label={`Apagar ${item.description}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )) : <p className="text-sm text-white/50">Nada registrado nesse dia.</p>}
                </div>

                <div className="hidden lg:block">
                  {analytics.items?.length ? (
                    <div className="overflow-hidden rounded-2xl border border-white/10">
                      <table className="min-w-full text-sm">
                        <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-white/50">
                          <tr>
                            <th className="px-4 py-3 font-medium">Hora</th>
                            <th className="px-4 py-3 font-medium">Tipo</th>
                            <th className="px-4 py-3 font-medium">Descrição</th>
                            <th className="px-4 py-3 font-medium">Detalhes</th>
                            <th className="px-4 py-3 font-medium text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.items.map((item: any) => (
                            <tr key={`desktop-${item.id}`} className="border-t border-white/10 align-top text-white/85">
                              <td className="px-4 py-3 text-white/60">{formatTimeLabel(item.logged_at)}</td>
                              <td className="px-4 py-3">{item.type === "workout" ? "Treino" : "Refeição"}</td>
                              <td className="px-4 py-3 font-medium">{item.description}</td>
                              <td className="px-4 py-3 text-white/60">
                                {item.type === "workout"
                                  ? `${item.amount || 0} min • ${item.calories} kcal`
                                  : `${item.amount || 0}${item.unit || "g"} • ${item.calories} kcal • P ${item.protein || 0}g • C ${item.carbs || 0}g • G ${item.fat || 0}g`}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => openEditItem(item)}
                                    className="rounded-full bg-white/10 p-2 text-white/70"
                                    aria-label={`Editar ${item.description}`}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(item)}
                                    disabled={deletingItemId === item.id}
                                    className="rounded-full bg-white/10 p-2 text-red-300 disabled:opacity-60"
                                    aria-label={`Apagar ${item.description}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-white/50">Nada registrado nesse dia.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-4 lg:px-0">
            <section className="rounded-3xl bg-[#111b21] p-4">
              <h2 className="mb-3 text-sm font-semibold text-white/85">Metas diárias</h2>
              <div className="grid grid-cols-2 gap-3">
                <ProfileNumber label="Calorias" value={goals.calories} onChange={(value) => setGoals((current) => ({ ...current, calories: value }))} />
                <ProfileNumber label="Proteína" value={goals.protein} onChange={(value) => setGoals((current) => ({ ...current, protein: value }))} />
                <ProfileNumber label="Carbo" value={goals.carbs} onChange={(value) => setGoals((current) => ({ ...current, carbs: value }))} />
                <ProfileNumber label="Gordura" value={goals.fat} onChange={(value) => setGoals((current) => ({ ...current, fat: value }))} />
              </div>
            </section>

            <section className="rounded-3xl bg-[#111b21] p-4">
              <h2 className="mb-3 text-sm font-semibold text-white/85">Comportamento do parser</h2>
              <select
                value={preferences.parserMode}
                onChange={(event) => setPreferences((current) => ({ ...current, parserMode: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-sm outline-none"
              >
                <option value="conservative">Conservative</option>
                <option value="balanced">Balanced</option>
                <option value="aggressive">Aggressive</option>
              </select>
              <div className="mt-3">
                <ProfileNumber label="Retenção de imagens (dias)" value={preferences.imageRetentionDays} onChange={(value) => setPreferences((current) => ({ ...current, imageRetentionDays: value }))} />
              </div>
            </section>

            <button onClick={saveProfile} disabled={savingProfile} className="w-full rounded-full bg-emerald-400 px-4 py-3 font-semibold text-[#0b141a] disabled:opacity-60">
              {savingProfile ? "Salvando..." : "Salvar perfil"}
            </button>
          </div>
        )}
      </section>

      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[#111b21] pb-[max(env(safe-area-inset-bottom),12px)] pt-2 lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:pb-0 lg:pt-0">
        <div className="mx-auto w-full max-w-6xl lg:px-6">
          {activeTab === "chat" && (
            <div className="mx-auto max-w-md px-3 pb-3 lg:px-0 lg:pb-0">
              <div className="flex items-end gap-2 rounded-3xl bg-[#202c33] p-2">
                <button onClick={() => fileInputRef.current?.click()} className="rounded-full bg-white/5 p-3 text-white/75">
                  <Camera className="h-5 w-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleUpload(file);
                    event.target.value = "";
                  }}
                />
                <textarea
                  rows={1}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder={uploading ? "Enviando imagem..." : "Descreva sua refeição ou treino"}
                  className="max-h-28 flex-1 resize-none bg-transparent px-1 py-3 text-sm outline-none placeholder:text-white/35"
                />
                <button onClick={handleSend} disabled={sending || uploading} className="rounded-full bg-emerald-400 px-4 py-3 text-sm font-semibold text-[#0b141a] disabled:opacity-60">
                  {sending ? "Enviando" : "Enviar"}
                </button>
              </div>
            </div>
          )}

          <nav className="grid grid-cols-3 gap-1 px-2 lg:hidden">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex flex-col items-center justify-center rounded-2xl px-3 py-2 text-xs ${active ? "bg-white/10 text-emerald-300" : "text-white/55"}`}
                >
                  <Icon className="mb-1 h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </footer>

      {editingItem && editingDraft && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/60 p-3 lg:items-center lg:justify-center">
          <div className="w-full rounded-[28px] bg-[#111b21] p-4 shadow-2xl lg:max-w-2xl lg:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-emerald-300/80">{editingItem.type === "workout" ? "Editar treino" : "Editar refeição"}</div>
                <div className="text-lg font-semibold text-white">{editingItem.description}</div>
              </div>
              <button onClick={closeEditItem} disabled={savingItem} className="rounded-full bg-white/10 p-2 text-white/70">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-sm text-white/75">
                <span className="mb-2 block">{editingItem.type === "workout" ? "Treino" : "Descrição"}</span>
                <input
                  value={editingItem.type === "workout" ? editingDraft.modality || "" : editingDraft.description || ""}
                  onChange={(event) => setEditingDraft((current: any) => current ? {
                    ...current,
                    ...(editingItem.type === "workout" ? { modality: event.target.value } : { description: event.target.value }),
                  } : current)}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-white outline-none"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <ProfileNumber
                  label={editingItem.type === "workout" ? "Duração (min)" : "Quantidade"}
                  value={editingItem.type === "workout" ? Number(editingDraft.duration_min || 0) : Number(editingDraft.amount || 0)}
                  onChange={(value) => setEditingDraft((current: any) => current ? {
                    ...current,
                    ...(editingItem.type === "workout" ? { duration_min: value } : { amount: value }),
                  } : current)}
                />
                <ProfileNumber
                  label="Calorias"
                  value={Number(editingDraft.calories || 0)}
                  onChange={(value) => setEditingDraft((current: any) => current ? { ...current, calories: value } : current)}
                />
              </div>

              {editingItem.type !== "workout" && (
                <>
                  <label className="block text-sm text-white/75">
                    <span className="mb-2 block">Unidade</span>
                    <input
                      value={editingDraft.unit || "g"}
                      onChange={(event) => setEditingDraft((current: any) => current ? { ...current, unit: event.target.value } : current)}
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-white outline-none"
                    />
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <ProfileNumber label="Proteína" value={Number(editingDraft.protein || 0)} onChange={(value) => setEditingDraft((current: any) => current ? { ...current, protein: value } : current)} />
                    <ProfileNumber label="Carbo" value={Number(editingDraft.carbs || 0)} onChange={(value) => setEditingDraft((current: any) => current ? { ...current, carbs: value } : current)} />
                    <ProfileNumber label="Gordura" value={Number(editingDraft.fat || 0)} onChange={(value) => setEditingDraft((current: any) => current ? { ...current, fat: value } : current)} />
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button onClick={closeEditItem} disabled={savingItem} className="rounded-full border border-white/10 px-4 py-3 font-medium text-white/80 disabled:opacity-60">
                Cancelar
              </button>
              <button onClick={handleSaveItem} disabled={savingItem} className="rounded-full bg-emerald-400 px-4 py-3 font-semibold text-[#0b141a] disabled:opacity-60">
                {savingItem ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function MetricCard({ icon: Icon, label, value, tone }: { icon: React.ComponentType<any>; label: string; value: string; tone: string }) {
  const tones: Record<string, string> = {
    emerald: "from-emerald-500/20 to-emerald-300/5",
    blue: "from-sky-500/20 to-sky-300/5",
    amber: "from-amber-500/20 to-amber-300/5",
    purple: "from-violet-500/20 to-violet-300/5",
  };

  return (
    <div className={`rounded-3xl bg-gradient-to-br ${tones[tone]} p-4`}>
      <div className="mb-3 inline-flex rounded-2xl bg-white/10 p-2"><Icon className="h-4 w-4" /></div>
      <div className="text-xs uppercase tracking-wide text-white/55">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-white/60">{value} / {goal}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${macroProgress(Number(value || 0), Number(goal || 1))}%` }} />
      </div>
    </div>
  );
}

function ProfileNumber({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block text-sm text-white/75">
      <span className="mb-2 block">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value || 0))}
        className="w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-white outline-none"
      />
    </label>
  );
}
