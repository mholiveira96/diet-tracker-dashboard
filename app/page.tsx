"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Camera, MessageCircle, Settings } from 'lucide-react';
import dateUtils from '../lib/date.js';
import tabUtils from '../lib/ui/tabs.js';
import chatPresentation from '../lib/chat/presentation.js';
import analyticsActions from '../lib/analytics/item-actions.js';
import profileDashboard from '../lib/ui/profile-dashboard.js';
import { ChatScreen } from './_components/chat-screen';
import { AnalyticsScreen } from './_components/analytics-screen';
import { ProfileScreen } from './_components/profile-screen';
import { EditItemModal } from './_components/edit-item-modal';
import { GroupOverview } from './_components/group-overview';
import { Select } from '../components/ui/select';
import type { AnalyticsData, AnalyticsTimelineItem, AuditEvent, ChatAttachment, ChatMessage, GoalsState, GroupOverviewItem, PreferencesState, ProfileSummary, TabKey } from './_components/types';

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
  getItemResource: (item: AnalyticsTimelineItem) => { itemType: 'meal' | 'workout'; recordId: number; endpoint: string };
  buildEditPayload: (item: AnalyticsTimelineItem) => any;
  buildDeleteCopy: (item: AnalyticsTimelineItem) => string;
};

const { PROFILE_STORAGE_KEY, getStoredProfileId, profileRequestUrl, withProfileId } = profileDashboard as {
  PROFILE_STORAGE_KEY: string;
  getStoredProfileId: (storage: Storage | null | undefined) => number | null;
  profileRequestUrl: (path: string, params?: Record<string, string | number | null | undefined>) => string;
  withProfileId: (payload: any, profileId: number) => any;
};

const tabs: Array<{ key: TabKey; label: string; icon: React.ComponentType<any> }> = [
  { key: 'chat', label: 'Chat', icon: MessageCircle },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'profile', label: 'Profile', icon: Settings },
];

async function parseJsonResponse(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Não consegui concluir essa ação agora.');
  }
  return payload;
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    if (typeof window === 'undefined') return 'chat';
    return getStoredTab(window.sessionStorage);
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [stagedAttachments, setStagedAttachments] = useState<ChatAttachment[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [overview, setOverview] = useState<GroupOverviewItem[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    return getStoredProfileId(window.localStorage);
  });
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [restoringAuditId, setRestoringAuditId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => getTodayInTimezone(new Date(), 'America/Sao_Paulo'));
  const [goals, setGoals] = useState<GoalsState>({ calories: 2500, protein: 200, carbs: 270, fat: 70 });
  const [preferences, setPreferences] = useState<PreferencesState>({ parserMode: 'balanced', imageRetentionDays: 180 });
  const [savingProfile, setSavingProfile] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null);
  const [confirmingMessageId, setConfirmingMessageId] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<AnalyticsTimelineItem | null>(null);
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

  async function loadThread(profileId = activeProfileId) {
    if (!profileId) {
      setMessages([]);
      setPendingMessages([]);
      return;
    }
    const payload = await parseJsonResponse(await fetch(profileRequestUrl('/api/chat/thread', { profileId }), { cache: 'no-store' }));
    if (payload.messages) setMessages(payload.messages);
  }

  async function loadProfiles(date = selectedDate) {
    const payload = await parseJsonResponse(await fetch(profileRequestUrl('/api/profiles', { date }), { cache: 'no-store' }));
    setProfiles(payload.profiles || []);
    setOverview(payload.overview || []);
  }

  async function loadAnalytics(date = selectedDate, profileId = activeProfileId) {
    if (!profileId) {
      setAnalytics(null);
      return;
    }
    const payload = await parseJsonResponse(await fetch(profileRequestUrl('/api/data', { profileId, date }), { cache: 'no-store' }));
    setAnalytics(payload);
  }

  async function loadAudit(profileId = activeProfileId) {
    if (!profileId) {
      setAuditEvents([]);
      return;
    }
    const payload = await parseJsonResponse(await fetch(profileRequestUrl('/api/audit', { profileId }), { cache: 'no-store' }));
    setAuditEvents(payload.events || []);
  }

  async function loadProfile(profileId = activeProfileId) {
    if (!profileId) return;
    const [goalsPayload, prefPayload] = await Promise.all([
      parseJsonResponse(await fetch(profileRequestUrl('/api/goals', { profileId }), { cache: 'no-store' })),
      parseJsonResponse(await fetch('/api/preferences', { cache: 'no-store' })),
    ]);
    setGoals(goalsPayload);
    setPreferences(prefPayload);
  }

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  useEffect(() => {
    loadProfiles(selectedDate).catch((error) => {
      setSubmissionFeedback(error.message || 'Não consegui carregar o resumo do grupo.');
    });
  }, [selectedDate]);

  useEffect(() => {
    if (!activeProfileId) {
      setAnalytics(null);
      setAuditEvents([]);
      return;
    }
    Promise.all([loadThread(activeProfileId), loadAnalytics(selectedDate, activeProfileId), loadProfile(activeProfileId), loadAudit(activeProfileId)]).catch((error) => {
      setSubmissionFeedback(error.message || 'Não consegui carregar os dados do perfil.');
    });
  }, [activeProfileId, selectedDate]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(TAB_STORAGE_KEY, activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (activeProfileId) window.localStorage.setItem(PROFILE_STORAGE_KEY, String(activeProfileId));
    else window.localStorage.removeItem(PROFILE_STORAGE_KEY);
  }, [activeProfileId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingMessages, activeTab]);

  async function handleUpload(file: File) {
    if (!activeProfileId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('profileId', String(activeProfileId));
      const payload = await parseJsonResponse(await fetch('/api/chat/upload', { method: 'POST', body: formData }));
      if (payload.attachment) {
        setStagedAttachments((current) => [...current, payload.attachment]);
        setSubmissionFeedback('Imagem anexada.');
      }
    } catch (error: any) {
      setSubmissionFeedback(error.message || 'Não consegui enviar a imagem.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSend() {
    if (!activeProfileId || (!text.trim() && stagedAttachments.length === 0)) return;

    const textToSend = text;
    const attachmentsToSend = [...stagedAttachments];
    const optimistic = buildPendingMessages({ text: textToSend, attachments: attachmentsToSend });

    setPendingMessages([optimistic.userMessage, optimistic.waitingMessage]);
    setText('');
    setStagedAttachments([]);
    setSending(true);
    setSubmissionFeedback('Mensagem recebida. Vou registrar agora...');

    try {
      const payload = await parseJsonResponse(await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSend,
          attachmentIds: attachmentsToSend.map((attachment) => attachment.id),
          profileId: activeProfileId,
        }),
      }));

      if (payload.messages) {
        setMessages(payload.messages);
        setPendingMessages([]);
        setSubmissionFeedback(describeResult(payload.result) || 'Registro atualizado.');
        await loadAnalytics(selectedDate);
      }
    } catch (error: any) {
      setPendingMessages([]);
      setText(textToSend);
      setStagedAttachments(attachmentsToSend);
      setSubmissionFeedback(error.message || 'Não consegui registrar agora.');
    } finally {
      setSending(false);
    }
  }

  async function handleConfirmDraft(messageId: number) {
    if (!activeProfileId) return;
    setConfirmingMessageId(messageId);
    setSubmissionFeedback('Salvando rascunho...');
    try {
      const payload = await parseJsonResponse(await fetch(`/api/chat/messages/${messageId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: activeProfileId }),
      }));
      if (payload.messages) {
        setMessages(payload.messages);
        setSubmissionFeedback('Rascunho salvo com sucesso.');
        await loadAnalytics(selectedDate);
      }
    } catch (error: any) {
      setSubmissionFeedback(error.message || 'Não consegui salvar esse rascunho.');
    } finally {
      setConfirmingMessageId(null);
    }
  }

  async function saveProfile() {
    if (!activeProfileId) return;
    setSavingProfile(true);
    setSubmissionFeedback('Salvando perfil...');
    try {
      await Promise.all([
        parseJsonResponse(await fetch('/api/goals', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(withProfileId(goals, activeProfileId)),
        })),
        parseJsonResponse(await fetch('/api/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(preferences),
        })),
      ]);
      await Promise.all([loadAnalytics(selectedDate, activeProfileId), loadProfiles(selectedDate)]);
      setSubmissionFeedback('Ajustes salvos.');
    } catch (error: any) {
      setSubmissionFeedback(error.message || 'Não consegui salvar o perfil.');
    } finally {
      setSavingProfile(false);
    }
  }

  function openEditItem(item: AnalyticsTimelineItem) {
    setEditingItem(item);
    setEditingDraft(buildEditPayload(item));
  }

  function closeEditItem() {
    if (savingItem) return;
    setEditingItem(null);
    setEditingDraft(null);
  }

  async function handleSaveItem() {
    if (!editingItem || !editingDraft || !activeProfileId) return;
    const { endpoint, itemType } = getItemResource(editingItem);

    setSavingItem(true);
    setSubmissionFeedback(itemType === 'workout' ? 'Salvando treino...' : 'Salvando refeição...');
    try {
      await parseJsonResponse(await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withProfileId(editingDraft, activeProfileId)),
      }));
      await Promise.all([loadAnalytics(selectedDate, activeProfileId), loadAudit(activeProfileId), loadProfiles(selectedDate)]);
      setSubmissionFeedback(itemType === 'workout' ? 'Treino atualizado.' : 'Refeição atualizada.');
      setEditingItem(null);
      setEditingDraft(null);
    } catch (error: any) {
      setSubmissionFeedback(error.message || 'Não consegui salvar essa edição.');
    } finally {
      setSavingItem(false);
    }
  }

  async function handleDeleteItem(item: AnalyticsTimelineItem) {
    if (!activeProfileId) return;
    const confirmed = window.confirm(buildDeleteCopy(item));
    if (!confirmed) return;

    const { endpoint, itemType } = getItemResource(item);
    setDeletingItemId(item.id);
    setSubmissionFeedback(itemType === 'workout' ? 'Apagando treino...' : 'Apagando refeição...');
    try {
      await parseJsonResponse(await fetch(profileRequestUrl(endpoint, { profileId: activeProfileId }), { method: 'DELETE' }));
      await Promise.all([loadAnalytics(selectedDate, activeProfileId), loadAudit(activeProfileId), loadProfiles(selectedDate)]);
      setSubmissionFeedback(itemType === 'workout' ? 'Treino apagado.' : 'Refeição apagada.');
      if (editingItem?.id === item.id) {
        setEditingItem(null);
        setEditingDraft(null);
      }
    } catch (error: any) {
      setSubmissionFeedback(error.message || 'Não consegui apagar esse registro.');
    } finally {
      setDeletingItemId(null);
    }
  }

  async function handleRestoreAudit(event: AuditEvent) {
    if (!activeProfileId) return;
    setRestoringAuditId(event.id);
    setSubmissionFeedback('Restaurando registro...');
    try {
      await parseJsonResponse(await fetch(`/api/audit/${event.id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: activeProfileId }),
      }));
      await Promise.all([loadAnalytics(selectedDate, activeProfileId), loadAudit(activeProfileId), loadProfiles(selectedDate)]);
      setSubmissionFeedback('Registro restaurado.');
    } catch (error: any) {
      setSubmissionFeedback(error.message || 'Não consegui restaurar esse registro.');
    } finally {
      setRestoringAuditId(null);
    }
  }

  function selectProfile(profileId: number | null) {
    setActiveProfileId(profileId);
    setMessages([]);
    setPendingMessages([]);
    setStagedAttachments([]);
    if (profileId) setActiveTab('analytics');
  }

  return (
    <main className="min-h-screen bg-[#0b141a] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#111b21]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 pb-3 pt-4 lg:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">Diet Tracker</p>
            <h1 className="text-lg font-semibold">Matheusinho</h1>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <label className="sr-only" htmlFor="active-profile">Perfil ativo</label>
            <Select
              id="active-profile"
              value={activeProfileId ? String(activeProfileId) : ''}
              onChange={(event) => selectProfile(event.target.value ? Number(event.target.value) : null)}
              className="h-10 w-40 rounded-xl py-1 text-xs sm:w-48"
            >
              <option value="">Visão do grupo</option>
              {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_name}</option>)}
            </Select>
            <div className="hidden items-center gap-2 rounded-full bg-white/5 p-1 lg:flex">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;
                return (
                  <button
                    key={`header-${tab.key}`}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm ${active ? 'bg-white/10 text-emerald-300' : 'text-white/55'}`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto flex max-w-6xl flex-1 overflow-y-auto pb-24 lg:px-6 lg:pb-8">
        {!activeProfileId ? (
          <GroupOverview overview={overview} selectedDate={selectedDate} onSelectProfile={selectProfile} />
        ) : (
          <>
            {activeTab === 'chat' && (
              <ChatScreen
                displayedMessages={displayedMessages}
                stagedAttachments={stagedAttachments}
                submissionFeedback={submissionFeedback}
                confirmingMessageId={confirmingMessageId}
                onConfirmDraft={handleConfirmDraft}
                messagesEndRef={messagesEndRef}
              />
            )}

            {activeTab === 'analytics' && analytics && (
              <AnalyticsScreen
                analytics={analytics}
                selectedDate={selectedDate}
                netCalories={netCalories}
                deletingItemId={deletingItemId}
                onPreviousDate={() => setSelectedDate((value) => shiftDate(value, -1))}
                onNextDate={() => setSelectedDate((value) => shiftDate(value, 1))}
                onEditItem={openEditItem}
                onDeleteItem={handleDeleteItem}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileScreen
                goals={goals}
                preferences={preferences}
                savingProfile={savingProfile}
                onGoalsChange={setGoals}
                onPreferencesChange={setPreferences}
                onSave={saveProfile}
                auditEvents={auditEvents}
                restoringAuditId={restoringAuditId}
                onRestoreAudit={handleRestoreAudit}
              />
            )}
          </>
        )}
      </section>

      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[#111b21] pb-[max(env(safe-area-inset-bottom),12px)] pt-2 lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:pb-0 lg:pt-0">
        <div className="mx-auto w-full max-w-6xl lg:px-6">
          {activeProfileId && activeTab === 'chat' && (
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
                    event.target.value = '';
                  }}
                />
                <textarea
                  rows={1}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder={uploading ? 'Enviando imagem...' : 'Registre refeição ou treino. Ex: 3 ovos e café'}
                  className="max-h-28 flex-1 resize-none bg-transparent px-1 py-3 text-sm outline-none placeholder:text-white/35"
                />
                <button onClick={handleSend} disabled={sending || uploading} className="rounded-full bg-emerald-400 px-4 py-3 text-sm font-semibold text-[#0b141a] disabled:opacity-60">
                  {sending ? 'Registrando' : 'Registrar'}
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
                  className={`flex flex-col items-center justify-center rounded-2xl px-3 py-2 text-xs ${active ? 'bg-white/10 text-emerald-300' : 'text-white/55'}`}
                >
                  <Icon className="mb-1 h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </footer>

      <EditItemModal
        editingItem={editingItem}
        editingDraft={editingDraft}
        savingItem={savingItem}
        onClose={closeEditItem}
        onSave={handleSaveItem}
        onChange={(updater) => setEditingDraft((current: any) => updater(current))}
      />
    </main>
  );
}
