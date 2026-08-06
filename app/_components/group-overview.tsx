"use client";

import React from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Flame, Trophy } from 'lucide-react';
import type { GroupAdherenceProfile, GroupOverviewItem, SevenDayDeficitItem } from './types';
import heatmapPresentation from '../../lib/group/heatmap.js';

const { buildConsistencyHeatmap } = heatmapPresentation as {
  buildConsistencyHeatmap: (days: GroupAdherenceProfile['days'], endDate: string, windowDays?: number) => {
    startDate: string;
    endDate: string;
    weeks: Array<{ key: string; monthLabel: string; cells: Array<{ date: string; inRange: boolean; day: GroupAdherenceProfile['days'][number] | null }> }>;
  };
};

function avatarSrc(slug: string) { return `/avatars/${slug}.jpg`; }

const squareTone: Record<string, string> = {
  no_record: 'bg-[#f4eaf0] ring-1 ring-inset ring-[#ead8e2]',
  below: 'bg-[#f8c9dc] ring-1 ring-inset ring-[#f2b4cf]',
  on_target: 'bg-[#e75491] ring-1 ring-inset ring-[#d84382]',
  above: 'bg-[#9e235d] ring-1 ring-inset ring-[#8e1f54]',
};

const statusLabel: Record<string, string> = {
  no_record: 'Sem registro',
  below: 'Abaixo da meta',
  on_target: 'Dentro da meta',
  above: 'Acima da meta',
};

function dayTitle(day: GroupAdherenceProfile['days'][number]) {
  return `${day.date}: ${statusLabel[day.status]} — ${Math.round(day.net_calories).toLocaleString('pt-BR')}/${Math.round(day.goal_calories).toLocaleString('pt-BR')} kcal líquidas`;
}

function ConsistencyHeatmap({ profile, endDate, onSelect }: { profile: GroupAdherenceProfile; endDate: string; onSelect: () => void }) {
  const heatmap = buildConsistencyHeatmap(profile.days, endDate, 365);
  const recorded = profile.days.filter((day) => day.status !== 'no_record').length;
  const selectedDay = profile.days.find((day) => day.date === endDate) || profile.days[profile.days.length - 1];

  return (
    <div className="rounded-[24px] border border-[#efd7e3] bg-white/48 p-3 sm:p-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onSelect} className="flex w-36 shrink-0 items-center gap-2.5 rounded-2xl p-1 text-left hover:bg-pink-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-500 sm:w-44">
          <img className="h-10 w-10 rounded-2xl border-2 border-white object-cover" src={avatarSrc(profile.slug)} alt={`Avatar de ${profile.display_name}`} />
          <span className="min-w-0"><span className="block truncate text-sm font-semibold text-[#47253a]">{profile.display_name}</span><span className="mt-0.5 block text-[10px] font-medium text-[#8b687c]">{recorded}/365 dias</span></span>
        </button>
        <div className="min-w-0 flex-1 overflow-x-auto pb-1 [scrollbar-width:thin]">
          <div className="min-w-[760px]">
            <div className="ml-8 flex gap-1">
              {heatmap.weeks.map((week) => <span key={`month-${week.key}`} className="h-4 w-3 shrink-0 text-[9px] font-medium text-[#9a788b]">{week.monthLabel}</span>)}
            </div>
            <div className="mt-1 grid grid-cols-[24px_auto] gap-2">
              <div className="grid grid-rows-7 gap-1 text-[9px] leading-3 text-[#9a788b]"><span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span></div>
              <div className="flex gap-1">
                {heatmap.weeks.map((week) => (
                  <div key={week.key} className="grid grid-rows-7 gap-1">
                    {week.cells.map((cell) => cell.inRange ? (
                      <span key={cell.date} title={cell.day ? dayTitle(cell.day) : `${cell.date}: Sem registro`} aria-label={cell.day ? dayTitle(cell.day) : `${cell.date}: Sem registro`} className={`h-3 w-3 shrink-0 rounded-[3px] transition-transform hover:scale-125 ${squareTone[cell.day?.status || 'no_record']}`} />
                    ) : <span key={cell.date} aria-hidden className="h-3 w-3 shrink-0" />)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {selectedDay && <span className={`hidden shrink-0 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] sm:inline-flex ${selectedDay.status === 'above' ? 'bg-[#f9e1ec] text-[#9e235d]' : selectedDay.status === 'on_target' ? 'bg-[#ffe5f0] text-[#c62d72]' : 'bg-[#f7edf2] text-[#8b687c]'}`}>{statusLabel[selectedDay.status]}</span>}
      </div>
    </div>
  );
}

export function GroupOverview({ overview, leaderboard, adherence, selectedDate, loading, onSelectProfile, onPreviousDate, onNextDate }: { overview: GroupOverviewItem[]; leaderboard: SevenDayDeficitItem[]; adherence: GroupAdherenceProfile[]; selectedDate: string; loading?: boolean; onSelectProfile: (profileId: number) => void; onPreviousDate: () => void; onNextDate: () => void; }) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 lg:px-0 lg:py-7">
      <section className="ios-surface relative overflow-hidden rounded-[32px]">
        <div className="pointer-events-none absolute -right-28 -top-32 h-72 w-72 rounded-full bg-gradient-to-br from-pink-200/80 via-rose-100/50 to-transparent blur-2xl" />
        <div className="relative border-b border-[#f0dce7] p-5 lg:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Ritmo em conjunto</p><h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#432238]">Visão do grupo</h2><p className="mt-1.5 max-w-xl text-sm leading-6 text-[#816176]">Meta comparada ao saldo líquido de cada pessoa.</p></div><div className="flex items-center gap-1"><button type="button" onClick={onPreviousDate} aria-label="Ver dia anterior" className="ios-chip p-2 hover:bg-pink-50"><ChevronLeft className="h-4 w-4" /></button><span className="ios-chip text-xs font-semibold tabular-nums">{selectedDate}</span><button type="button" onClick={onNextDate} aria-label="Ver próximo dia" className="ios-chip p-2 hover:bg-pink-50"><ChevronRight className="h-4 w-4" /></button></div></div>
        </div>
        {loading ? <div className="grid gap-3 p-4 sm:grid-cols-2 lg:p-5 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-48 animate-pulse rounded-[26px] bg-pink-100/60" />)}</div> : <div className="grid gap-3 p-4 sm:grid-cols-2 lg:p-5 xl:grid-cols-4">{overview.map((profile) => { const goal = Number(profile.goal_calories || 0); const consumed = Number(profile.kcal || 0); const workout = Number(profile.workout_kcal || 0); const net = consumed - workout; const progress = goal ? Math.max(0, Math.min(100, Math.round((net / goal) * 100))) : 0; return <button key={profile.id} onClick={() => onSelectProfile(profile.id)} className="ios-surface group min-h-[190px] rounded-[26px] p-4 text-left transition-colors duration-200 hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-500"><div className="flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-3"><img className="h-11 w-11 rounded-2xl border-2 border-white object-cover" src={avatarSrc(profile.slug)} alt={`Avatar de ${profile.display_name}`} /><span className="truncate font-semibold text-[#49263d]">{profile.display_name}</span></div><span className="rounded-full bg-pink-100 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-pink-600">Ativo</span></div><div className="mt-5 flex items-baseline gap-1"><span className="text-2xl font-semibold tracking-[-0.05em] text-[#432238] tabular-nums">{Math.round(net).toLocaleString('pt-BR')}</span><span className="text-xs font-medium text-[#947488]">/ {Math.round(goal).toLocaleString('pt-BR')} kcal líquidas</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f7e7ef]"><div className="h-full rounded-full bg-gradient-to-r from-rose-300 via-pink-500 to-fuchsia-500 transition-[width] duration-300" style={{ width: `${progress}%` }} /></div><div className="mt-3 flex items-center justify-between text-[11px] text-[#846579]"><span>Consumido {Math.round(consumed)} · treino -{Math.round(workout)}</span><span className="inline-flex items-center gap-1 font-semibold text-pink-600">Abrir <ArrowUpRight className="h-3.5 w-3.5" /></span></div></button>; })}</div>}
      </section>

      <section className="ios-surface overflow-hidden rounded-[32px]">
        <div className="relative border-b border-[#f0dce7] p-5 lg:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Consistência</p><h3 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[#432238]">Últimos 12 meses</h3><p className="mt-1 text-sm text-[#816176]">Cada quadrado é um dia: a cor compara o saldo líquido com a meta.</p></div><div className="flex flex-wrap items-center gap-2 text-[10px] font-medium text-[#7d5c71]"><span><i className="mr-1 inline-block h-3 w-3 rounded-[3px] bg-[#f4eaf0] ring-1 ring-inset ring-[#ead8e2]" />Sem registro</span><span><i className="mr-1 inline-block h-3 w-3 rounded-[3px] bg-[#f8c9dc]" />Abaixo</span><span><i className="mr-1 inline-block h-3 w-3 rounded-[3px] bg-[#e75491]" />Na meta</span><span><i className="mr-1 inline-block h-3 w-3 rounded-[3px] bg-[#9e235d]" />Acima</span></div></div></div>
        <div className="space-y-3 p-4 lg:p-5">{loading ? [0, 1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-[24px] bg-pink-100/60" />) : adherence.map((profile) => <ConsistencyHeatmap key={profile.id} profile={profile} endDate={selectedDate === 'now' ? new Date().toISOString().slice(0, 10) : selectedDate} onSelect={() => onSelectProfile(profile.id)} />)}</div>
      </section>

      <section className="ios-surface overflow-hidden rounded-[32px]">
        <div className="flex items-start gap-3 border-b border-[#f0dce7] p-5 lg:p-6"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#fff2dd] text-[#bd6b18]"><Trophy className="h-5 w-5" /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#bd6b18]">Placar da semana</p><h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[#432238]">Maiores déficits · últimos 7 dias</h2><p className="mt-1 text-sm text-[#816176]">Percentual sobre a meta líquida acumulada.</p></div></div>
        {loading ? <div className="space-y-3 p-4 lg:p-5">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-pink-100/60" />)}</div> : leaderboard.length ? <ol className="divide-y divide-[#f0dce7] px-4 lg:px-5">{leaderboard.map((profile, index) => { const deficit = Math.round(profile.deficit_percent); const kcal = Math.round(profile.deficit_calories).toLocaleString('pt-BR'); return <li key={profile.id}><button onClick={() => onSelectProfile(profile.id)} className="flex min-h-[72px] w-full items-center gap-3 py-3 text-left transition-colors duration-200 hover:bg-pink-50/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-pink-500"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${index === 0 ? 'bg-[#fff2dd] text-[#bd6b18]' : 'bg-[#f8edf2] text-[#876379]'}`}>{index + 1}</span><img className="h-10 w-10 shrink-0 rounded-2xl border border-white object-cover" src={avatarSrc(profile.slug)} alt="" /><span className="min-w-0 flex-1"><span className="block truncate font-semibold text-[#49263d]">{profile.display_name}</span><span className="mt-0.5 block text-xs text-[#876379]">{profile.active_days} dias com registro · déficit de {kcal} kcal</span></span><span className="flex items-center gap-1 text-lg font-semibold tabular-nums text-pink-600"><Flame className="h-4 w-4" />{deficit > 0 ? '+' : ''}{deficit}%</span></button></li>; })}</ol> : <div className="p-8 text-center text-sm text-[#846579]">Ainda não há registros para formar o placar.</div>}
      </section>
    </div>
  );
}
