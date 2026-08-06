"use client";

import React from 'react';
import { ArrowUpRight, Flame, Trophy } from 'lucide-react';
import type { GroupAdherenceProfile, GroupOverviewItem, SevenDayDeficitItem } from './types';

function avatarSrc(slug: string) { return `/avatars/${slug}.jpg`; }

const squareTone = {
  no_record: 'bg-[#f6eef3] ring-1 ring-inset ring-[#ecdae4]',
  below: 'bg-rose-300',
  on_target: 'bg-pink-500',
  above: 'bg-fuchsia-700',
};

const statusLabel = { no_record: 'Sem registro', below: 'Abaixo da meta', on_target: 'Dentro da meta', above: 'Acima da meta' };

function dayTitle(day: GroupAdherenceProfile['days'][number]) {
  return `${day.date}: ${statusLabel[day.status]} — ${Math.round(day.net_calories).toLocaleString('pt-BR')}/${Math.round(day.goal_calories).toLocaleString('pt-BR')} kcal líquidas`;
}

function Timeline({ profile, onSelect }: { profile: GroupAdherenceProfile; onSelect: () => void }) {
  const recorded = profile.days.filter((day) => day.status !== 'no_record').length;
  return (
    <button onClick={onSelect} className="ios-surface group flex min-h-[92px] w-full items-stretch gap-4 rounded-[24px] p-3 text-left transition-colors duration-200 hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-500 sm:p-4">
      <div className="flex w-28 shrink-0 flex-col justify-center sm:w-36">
        <div className="flex items-center gap-2.5"><img className="h-10 w-10 rounded-2xl border border-white object-cover" src={avatarSrc(profile.slug)} alt={`Avatar de ${profile.display_name}`} /><span className="truncate text-sm font-semibold text-[#47253a]">{profile.display_name}</span></div>
        <span className="mt-2 text-[11px] font-medium text-[#8b687c]">{recorded}/{profile.days.length} dias</span>
      </div>
      <div className="min-w-0 flex-1 overflow-x-auto py-1 [scrollbar-width:thin]">
        <div className="flex min-w-max items-center gap-1.5 px-0.5">
          {profile.days.map((day, index) => (
            <React.Fragment key={day.date}>
              {index > 0 && day.date.slice(8) === '01' && <span aria-hidden className="mx-1 h-7 w-px bg-[#ead8e2]" />}
              <span title={dayTitle(day)} aria-label={dayTitle(day)} className={`h-4 w-4 shrink-0 rounded-[5px] transition-colors duration-200 ${squareTone[day.status]}`} />
            </React.Fragment>
          ))}
        </div>
        <div className="mt-2 flex min-w-max justify-between pr-1 text-[10px] font-medium text-[#9a788b]"><span>Hoje</span><span>31 dez.</span></div>
      </div>
    </button>
  );
}

export function GroupOverview({ overview, leaderboard, adherence, selectedDate, loading, onSelectProfile }: { overview: GroupOverviewItem[]; leaderboard: SevenDayDeficitItem[]; adherence: GroupAdherenceProfile[]; selectedDate: string; loading?: boolean; onSelectProfile: (profileId: number) => void; }) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 lg:px-0 lg:py-7">
      <section className="ios-surface relative overflow-hidden rounded-[32px]">
        <div className="pointer-events-none absolute -right-28 -top-32 h-72 w-72 rounded-full bg-gradient-to-br from-pink-200/80 via-rose-100/50 to-transparent blur-2xl" />
        <div className="relative border-b border-[#f0dce7] p-5 lg:p-7">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Ritmo em conjunto</p><h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#432238]">Visão do grupo</h2><p className="mt-1.5 max-w-xl text-sm leading-6 text-[#816176]">Metas individuais, constância compartilhada.</p></div><span className="ios-chip shrink-0 text-xs font-semibold tabular-nums">{selectedDate}</span></div>
        </div>
        {loading ? <div className="grid gap-3 p-4 sm:grid-cols-2 lg:p-5 xl:grid-cols-4">{[0,1,2,3].map((i) => <div key={i} className="h-48 animate-pulse rounded-[26px] bg-pink-100/60" />)}</div> : <div className="grid gap-3 p-4 sm:grid-cols-2 lg:p-5 xl:grid-cols-4">{overview.map((profile) => { const goal = Number(profile.goal_calories || 0); const food = Number(profile.kcal || 0); const net = food - Number(profile.workout_kcal || 0); const progress = goal ? Math.max(0, Math.min(100, Math.round((net / goal) * 100))) : 0; return <button key={profile.id} onClick={() => onSelectProfile(profile.id)} className="ios-surface group min-h-[190px] rounded-[26px] p-4 text-left transition-colors duration-200 hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-500"><div className="flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-3"><img className="h-11 w-11 rounded-2xl border-2 border-white object-cover" src={avatarSrc(profile.slug)} alt={`Avatar de ${profile.display_name}`} /><span className="truncate font-semibold text-[#49263d]">{profile.display_name}</span></div><span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${profile.status === 'active' ? 'bg-pink-100 text-pink-600' : 'bg-[#f6eef2] text-[#96798a]'}`}>{profile.status === 'active' ? 'Ativo' : profile.status}</span></div><div className="mt-5 flex items-baseline gap-1"><span className="text-2xl font-semibold tracking-[-0.05em] text-[#432238] tabular-nums">{net}</span><span className="text-xs font-medium text-[#947488]">/ {goal} kcal líquidas</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f7e7ef]"><div className="h-full rounded-full bg-gradient-to-r from-rose-300 via-pink-500 to-fuchsia-500 transition-[width] duration-300" style={{width:`${progress}%`}} /></div><div className="mt-3 flex items-center justify-between text-xs text-[#846579]"><span>P {profile.protein || 0}/{profile.goal_protein || 0}g</span><span className="inline-flex items-center gap-1 font-semibold text-pink-600">Ver análise <ArrowUpRight className="h-3.5 w-3.5" /></span></div></button>})}</div>}
        <div className="relative border-t border-[#f0dce7] p-4 lg:p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Constância visual</p><h3 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[#432238]">Hoje → fim de 2026</h3></div><div className="flex flex-wrap gap-3 text-[11px] font-medium text-[#7d5c71]"><span><i className="mr-1.5 inline-block h-3 w-3 rounded-[4px] bg-rose-300"/>Abaixo</span><span><i className="mr-1.5 inline-block h-3 w-3 rounded-[4px] bg-pink-500"/>Dentro</span><span><i className="mr-1.5 inline-block h-3 w-3 rounded-[4px] bg-fuchsia-700"/>Acima</span><span><i className="mr-1.5 inline-block h-3 w-3 rounded-[4px] bg-[#f6eef3] ring-1 ring-inset ring-[#ecdae4]"/>Sem registro</span></div></div>
          <div className="space-y-2.5">{loading ? [0,1,2,3].map((i) => <div key={i} className="h-24 animate-pulse rounded-[24px] bg-pink-100/60" />) : adherence.map((profile) => <Timeline key={profile.id} profile={profile} onSelect={() => onSelectProfile(profile.id)} />)}</div>
        </div>
      </section>

      <section className="ios-surface overflow-hidden rounded-[32px]">
        <div className="flex items-start gap-3 border-b border-[#f0dce7] p-5 lg:p-6"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#fff2dd] text-[#bd6b18]"><Trophy className="h-5 w-5" /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#bd6b18]">Placar da semana</p><h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[#432238]">Maiores déficits · últimos 7 dias</h2><p className="mt-1 text-sm text-[#816176]">Percentual sobre a meta acumulada. Entram apenas perfis com registros no período.</p></div></div>
        {loading ? <div className="space-y-3 p-4 lg:p-5">{[0,1,2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-pink-100/60" />)}</div> : leaderboard.length ? <ol className="divide-y divide-[#f0dce7] px-4 lg:px-5">{leaderboard.map((profile,index) => { const deficit=Math.round(profile.deficit_percent); const kcal=Math.round(profile.deficit_calories).toLocaleString('pt-BR'); return <li key={profile.id}><button onClick={() => onSelectProfile(profile.id)} className="flex min-h-[72px] w-full items-center gap-3 py-3 text-left transition-colors duration-200 hover:bg-pink-50/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-pink-500"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${index===0?'bg-[#fff2dd] text-[#bd6b18]':'bg-[#f8edf2] text-[#876379]'}`}>{index+1}</span><img className="h-10 w-10 shrink-0 rounded-2xl border border-white object-cover" src={avatarSrc(profile.slug)} alt=""/><span className="min-w-0 flex-1"><span className="block truncate font-semibold text-[#49263d]">{profile.display_name}</span><span className="mt-0.5 block text-xs text-[#876379]">{profile.active_days} dias com registro · déficit de {kcal} kcal</span></span><span className="flex items-center gap-1 text-lg font-semibold tabular-nums text-pink-600"><Flame className="h-4 w-4" />{deficit>0?'+':''}{deficit}%</span></button></li>; })}</ol> : <div className="p-8 text-center text-sm text-[#846579]">Ainda não há registros para formar o placar.</div>}
      </section>
    </div>
  );
}
