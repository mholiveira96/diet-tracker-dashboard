"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Settings, UsersRound } from 'lucide-react';
import dateUtils from '../lib/date.js';
import tabUtils from '../lib/ui/tabs.js';
import analyticsActions from '../lib/analytics/item-actions.js';
import profileDashboard from '../lib/ui/profile-dashboard.js';
import { AnalyticsScreen } from './_components/analytics-screen';
import { ProfileScreen } from './_components/profile-screen';
import { EditItemModal } from './_components/edit-item-modal';
import { GroupOverview } from './_components/group-overview';
import { Select } from '../components/ui/select';
import type { AnalyticsData, AnalyticsTimelineItem, AuditEvent, GoalsState, GroupOverviewItem, PreferencesState, ProfileSummary, SevenDayDeficitItem, TabKey } from './_components/types';

const { getTodayInTimezone, shiftDate } = dateUtils as {
  getTodayInTimezone: (now?: Date | string, timeZone?: string) => string;
  shiftDate: (date: string, delta: number) => string;
};

const { TAB_STORAGE_KEY, getStoredTab } = tabUtils as {
  TAB_STORAGE_KEY: string;
  getStoredTab: (storage: Storage | null | undefined) => TabKey;
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
  { key: 'group', label: 'Visão do grupo', icon: UsersRound },
  { key: 'analytics', label: 'Desempenho', icon: BarChart3 },
  { key: 'profile', label: 'Perfil', icon: Settings },
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
    if (typeof window === 'undefined') return 'group';
    const stored = getStoredTab(window.sessionStorage);
    return getStoredProfileId(window.localStorage) ? stored : 'group';
  });
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [overview, setOverview] = useState<GroupOverviewItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<SevenDayDeficitItem[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
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
  const [editingItem, setEditingItem] = useState<AnalyticsTimelineItem | null>(null);
  const [editingDraft, setEditingDraft] = useState<any | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | number | null>(null);

  const netCalories = useMemo(() => {
    if (!analytics) return 0;
    return Number(analytics.summary?.kcal || 0) - Number(analytics.workouts?.total || 0);
  }, [analytics]);

  async function loadProfiles(date = selectedDate) {
    const payload = await parseJsonResponse(await fetch(profileRequestUrl('/api/profiles', { date }), { cache: 'no-store' }));
    setProfiles(payload.profiles || []);
    setOverview(payload.overview || []);
    setLeaderboard(payload.leaderboard || []);
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
    setLoadingProfiles(true);
    loadProfiles(selectedDate).catch((error) => {
      setSubmissionFeedback(error.message || 'Não consegui carregar o resumo do grupo.');
    }).finally(() => {
      setLoadingProfiles(false);
    });
  }, [selectedDate]);

  useEffect(() => {
    if (!activeProfileId) {
      setAnalytics(null);
      setAuditEvents([]);
      setLoadingAnalytics(false);
      return;
    }
    setLoadingAnalytics(true);
    Promise.all([loadAnalytics(selectedDate, activeProfileId), loadProfile(activeProfileId), loadAudit(activeProfileId)]).catch((error) => {
      setSubmissionFeedback(error.message || 'Não consegui carregar os dados do perfil.');
    }).finally(() => {
      setLoadingAnalytics(false);
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
    setActiveTab(profileId ? 'analytics' : 'group');
  }

  function selectTab(tab: TabKey) {
    setActiveTab(tab);
  }

  return (
    <main className="min-h-screen bg-[#0b141a] bg-[radial-gradient(circle_at_50%_-20%,rgba(16,185,129,0.13),transparent_38%),linear-gradient(180deg,#0b141a_0%,#0e171d_100%)] text-white">
      <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-[#111b21]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 pb-3 pt-4 lg:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300/80">Diet Tracker</p>
            <h1 className="mt-0.5 text-lg font-bold tracking-tight">Matheusinho</h1>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <label className="sr-only" htmlFor="active-profile">Perfil ativo</label>
            <Select
              id="active-profile"
              value={activeProfileId ? String(activeProfileId) : ''}
              onChange={(event) => selectProfile(event.target.value ? Number(event.target.value) : null)}
              className="h-10 w-40 rounded-lg border-white/[0.12] bg-black/20 py-1 text-xs sm:w-48"
            >
              <option value="">Visão do grupo</option>
              {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_name}</option>)}
            </Select>
            <div className="hidden items-center gap-1 rounded-xl border border-white/[0.08] bg-black/15 p-1 lg:flex">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;
                return (
                  <button
                    key={`header-${tab.key}`}
                    onClick={() => selectTab(tab.key)}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-400/40 ${active ? 'bg-emerald-300/12 text-emerald-200 shadow-sm' : 'text-white/55 hover:bg-white/[0.05] hover:text-white/80'}`}
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

      {submissionFeedback && <div className="mx-auto max-w-6xl px-4 pt-4 lg:px-6"><div role="status" className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.08] px-3 py-2 text-sm text-emerald-100/90">{submissionFeedback}</div></div>}

      <section className="mx-auto flex max-w-6xl flex-1 overflow-y-auto pb-24 lg:px-6 lg:pb-8">
        {activeTab === 'group' || !activeProfileId ? (
          <GroupOverview overview={overview} leaderboard={leaderboard} selectedDate={selectedDate} loading={loadingProfiles} onSelectProfile={selectProfile} />
        ) : (
          <>
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

            {activeTab === 'analytics' && !analytics && (
              <div className="mx-auto w-full max-w-3xl px-4 py-8 lg:px-0"><div className="rounded-2xl border border-white/[0.08] bg-[#111b21] px-6 py-12 text-center shadow-[0_12px_35px_rgba(0,0,0,0.16)]"><div className="mx-auto h-9 w-9 animate-pulse rounded-lg border border-emerald-300/20 bg-emerald-300/10" /><p className="mt-4 text-sm font-medium text-white/70">{loadingAnalytics ? 'Preparando o painel de desempenho...' : 'O painel ainda não está disponível.'}</p><p className="mt-1 text-xs text-white/40">{loadingAnalytics ? 'Carregando metas, registros e histórico.' : 'Selecione outro perfil ou tente novamente em instantes.'}</p></div></div>
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

      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/[0.08] bg-[#111b21]/95 pb-[max(env(safe-area-inset-bottom),12px)] pt-2 backdrop-blur-xl lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:pb-0 lg:pt-0">
        <div className="mx-auto w-full max-w-6xl lg:px-6">
          <nav className="grid grid-cols-3 gap-1 px-2 lg:hidden">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => selectTab(tab.key)}
                  className={`flex min-h-12 flex-col items-center justify-center rounded-xl px-3 py-2 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-400/40 ${active ? 'bg-emerald-300/12 text-emerald-200' : 'text-white/55'}`}
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
