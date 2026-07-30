"use client";

import React from 'react';
import { Activity, ArrowUpRight, Flame, Trophy } from 'lucide-react';
import type { GroupAdherenceProfile, GroupOverviewItem, SevenDayDeficitItem } from './types';

function avatarSrc(slug: string) {
  return `/avatars/${slug}.jpg`;
}

const squareTone = {
  no_record: 'bg-[#f5eaf0] ring-1 ring-inset ring-[#ead9e2]',
  below: 'bg-rose-300',
  on_target: 'bg-pink-500',
  above: 'bg-fuchsia-700',
};

const statusLabel = {
  no_record: 'Sem registro',
  below: 'Abaixo da meta',
  on_target: 'Dentro da meta',
  above: 'Acima da meta',
};

function formatDayTitle(day: GroupAdherenceProfile['days'][number]) {
  const net = Math.round(day.net_calories).toLocaleString('pt-BR');
  const goal = Math.round(day.goal_calories).toLocaleString('pt-BR');
  return `${day.date}: ${statusLabel[day.status]} — ${net}/${goal} kcal líquidas`;
}

function AdherenceGrid({ profile, onSelect }: { profile: GroupAdherenceProfile; onSelect: () => void }) {
  const registered = profile.days.filter((day) => day.status !== 'no_record').length;
  return (
    <button onClick={onSelect} className="group/adherence min-w-0 rounded-[24px] border border-white/70 bg-white/65 p-4 text-left shadow-[0_12px_32px_rgba(141,66,101,0.08)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-pink-400/50">
      <div className="flex items-center gap-3">
        <img className="h-10 w-10 rounded-2xl border border-white object-cover shadow-sm" src={avatarSrc(profile.slug)} alt={`Avatar de ${profile.display_name}`} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#47253a]">{profile.display_name}</p>
          <p className="mt-0.5 text-xs text-[#876379]">{registered}/28 dias registrados</p>
        </div>
      </div>
      <div className="mt-4 grid grid-flow-col grid-rows-7 justify-start gap-1.5" aria-label={`Histórico de 28 dias de ${profile.display_name}`}>
        {profile.days.map((day) => <span key={day.date} title={formatDayTitle(day)} className={`h-4 w-4 rounded-[5px] shadow-sm transition group-hover/adherence:scale-105 ${squareTone[day.status]}`} />)}
      </div>
    </button>
  );
}

export function GroupOverview({
  overview,
  leaderboard,
  adherence,
  selectedDate,
  loading,
  onSelectProfile,
}: {
  overview: GroupOverviewItem[];
  leaderboard: SevenDayDeficitItem[];
  adherence: GroupAdherenceProfile[];
  selectedDate: string;
  loading?: boolean;
  onSelectProfile: (profileId: number) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 lg:px-0 lg:py-7">
      <section className="relative overflow-hidden rounded-[32px] border border-white/80 bg-white/60 shadow-[0_24px_70px_rgba(139,57,96,0.12)] backdrop-blur-2xl">
        <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-gradient-to-br from-pink-200/80 via-rose-100/50 to-transparent blur-2xl" />
        <div className="relative border-b border-[#f0dce7] p-5 lg:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Ritmo em conjunto</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#432238]">Visão do grupo</h2>
              <p className="mt-1.5 max-w-xl text-sm leading-6 text-[#816176]">Metas individuais, constância compartilhada. Toque em alguém para abrir o perfil.</p>
            </div>
            <span className="shrink-0 rounded-2xl border border-white/80 bg-white/70 px-3 py-2 text-xs font-semibold tabular-nums text-[#76556b] shadow-sm">{selectedDate}</span>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:p-5 xl:grid-cols-4" aria-label="Carregando perfis">
            {[0, 1, 2, 3].map((index) => <div key={index} className="h-48 animate-pulse rounded-[26px] bg-pink-100/60" />)}
          </div>
        ) : overview.length ? (
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:p-5 xl:grid-cols-4">
            {overview.map((profile) => {
              const netCalories = Number(profile.kcal || 0) - Number(profile.workout_kcal || 0);
              const goal = Number(profile.goal_calories || 0);
              const progress = goal ? Math.min(100, Math.round((Number(profile.kcal || 0) / goal) * 100)) : 0;
              return (
                <button key={profile.id} onClick={() => onSelectProfile(profile.id)} className="group rounded-[26px] border border-white/80 bg-white/65 p-4 text-left shadow-[0_12px_30px_rgba(141,66,101,0.07)] backdrop-blur-xl transition duration-200 hover:-translate-y-1 hover:bg-white/95 hover:shadow-[0_18px_38px_rgba(141,66,101,0.13)] focus:outline-none focus:ring-2 focus:ring-pink-400/55">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <img className="h-11 w-11 rounded-2xl border-2 border-white object-cover shadow-md" src={avatarSrc(profile.slug)} alt={`Avatar de ${profile.display_name}`} />
                      <span className="truncate font-semibold text-[#49263d]">{profile.display_name}</span>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${profile.status === 'active' ? 'bg-pink-100 text-pink-600' : 'bg-[#f6eef2] text-[#96798a]'}`}>{profile.status === 'active' ? 'Ativo' : profile.status}</span>
                  </div>
                  <div className="mt-5 flex items-baseline gap-1"><span className="text-2xl font-semibold tracking-[-0.05em] text-[#432238] tabular-nums">{profile.kcal || 0}</span><span className="text-xs font-medium text-[#947488]">/ {profile.goal_calories || 0} kcal</span></div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f7e7ef]"><div className="h-full rounded-full bg-gradient-to-r from-rose-300 via-pink-500 to-fuchsia-500 transition-[width]" style={{ width: `${progress}%` }} /></div>
                  <div className="mt-3 flex items-center justify-between text-xs text-[#846579]"><span>P {profile.protein || 0} / {profile.goal_protein || 0}g</span><span>Líquido {netCalories} kcal</span></div>
                  <span className="mt-5 inline-flex items-center text-xs font-bold uppercase tracking-[0.12em] text-pink-600">Abrir perfil <ArrowUpRight className="ml-1 h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
                </button>
              );
            })}
          </div>
        ) : <div className="p-8 text-center text-sm text-[#846579]">Nenhum perfil disponível para o grupo.</div>}
      </section>

      <section className="rounded-[32px] border border-white/80 bg-white/55 p-5 shadow-[0_20px_60px_rgba(139,57,96,0.09)] backdrop-blur-2xl lg:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-fuchsia-600 text-white shadow-[0_8px_20px_rgba(190,24,93,0.25)]"><Activity className="h-5 w-5" /></div>
            <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Constância visual</p><h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[#432238]">Histórico de meta · últimos 28 dias</h2></div>
          </div>
          <div className="flex flex-wrap gap-3 text-[11px] font-medium text-[#7d5c71]"><span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-[4px] bg-rose-300" /> Abaixo</span><span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-[4px] bg-pink-500" /> Dentro</span><span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-[4px] bg-fuchsia-700" /> Acima</span><span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-[4px] bg-[#f5eaf0] ring-1 ring-inset ring-[#ead9e2]" /> Sem registro</span></div>
        </div>
        {loading ? <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((index) => <div key={index} className="h-32 animate-pulse rounded-[24px] bg-pink-100/60" />)}</div> : <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{adherence.map((profile) => <AdherenceGrid key={profile.id} profile={profile} onSelect={() => onSelectProfile(profile.id)} />)}</div>}
      </section>

      <section className="overflow-hidden rounded-[32px] border border-white/80 bg-white/60 shadow-[0_20px_60px_rgba(139,57,96,0.09)] backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#f0dce7] p-5 lg:p-6"><div className="flex gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#fff2dd] text-[#bd6b18]"><Trophy className="h-5 w-5" /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#bd6b18]">Placar da semana</p><h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[#432238]">Maiores déficits · últimos 7 dias</h2><p className="mt-1 text-sm text-[#816176]">Percentual sobre a meta acumulada. Entram apenas perfis com registros no período.</p></div></div></div>
        {loading ? <div className="space-y-3 p-4 lg:p-5">{[0, 1, 2].map((index) => <div key={index} className="h-16 animate-pulse rounded-2xl bg-pink-100/60" />)}</div> : leaderboard.length ? <ol className="divide-y divide-[#f0dce7] px-4 lg:px-5">{leaderboard.map((profile, index) => { const deficit = Math.round(profile.deficit_percent); const deficitKcal = Math.round(profile.deficit_calories).toLocaleString('pt-BR'); return <li key={profile.id}><button onClick={() => onSelectProfile(profile.id)} className="group flex w-full items-center gap-3 py-4 text-left transition hover:bg-white/55 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-pink-400/40"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold tabular-nums ${index === 0 ? 'bg-[#fff2dd] text-[#bd6b18]' : 'bg-[#f8edf2] text-[#876379]'}`}>{index + 1}</span><img className="h-10 w-10 shrink-0 rounded-2xl border border-white object-cover shadow-sm" src={avatarSrc(profile.slug)} alt=""/><span className="min-w-0 flex-1"><span className="block truncate font-semibold text-[#49263d]">{profile.display_name}</span><span className="mt-0.5 block text-xs text-[#876379]">{profile.active_days} {profile.active_days === 1 ? 'dia com registro' : 'dias com registro'} · déficit de {deficitKcal} kcal</span></span><span className="flex items-center gap-1 text-right text-lg font-semibold tabular-nums text-pink-600"><Flame className="h-4 w-4" />{deficit > 0 ? '+' : ''}{deficit}%</span></button></li>; })}</ol> : <div className="p-8 text-center text-sm text-[#846579]">Ainda não há registros para formar o placar.</div>}
      </section>
    </div>
  );
}
