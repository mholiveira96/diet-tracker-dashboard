"use client";

import React from 'react';
import type { GroupOverviewItem } from './types';

export function GroupOverview({
  overview,
  selectedDate,
  loading,
  onSelectProfile,
}: {
  overview: GroupOverviewItem[];
  selectedDate: string;
  loading?: boolean;
  onSelectProfile: (profileId: number) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 lg:px-0 lg:py-7">
      <section className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#111b21] shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
        <div className="border-b border-white/[0.08] bg-[linear-gradient(110deg,rgba(16,185,129,0.12),transparent_48%)] p-5 lg:p-6">
          <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300/85">Central de consistência</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight">Acompanhamento do grupo</h2>
            <p className="mt-1 text-sm text-white/50">Escolha um perfil para analisar o registro e manter o ritmo.</p>
          </div>
          <span className="shrink-0 rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-medium tabular-nums text-white/65">{selectedDate}</span>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:p-5 xl:grid-cols-4" aria-label="Carregando perfis">
            {[0, 1, 2, 3].map((index) => <div key={index} className="h-44 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.04]" />)}
          </div>
        ) : overview.length ? (
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:p-5 xl:grid-cols-4">
            {overview.map((profile) => {
              const netCalories = Number(profile.kcal || 0) - Number(profile.workout_kcal || 0);
              const goal = Number(profile.goal_calories || 0);
              const progress = goal ? Math.min(100, Math.round((Number(profile.kcal || 0) / goal) * 100)) : 0;
              return (
                <button
                  key={profile.id}
                  onClick={() => onSelectProfile(profile.id)}
                  className="group rounded-2xl border border-white/[0.09] bg-black/10 p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300/45 hover:bg-emerald-300/[0.06] focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-white">{profile.display_name}</span>
                    <span className={`rounded-md px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${profile.status === 'active' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/10 text-white/50'}`}>
                      {profile.status === 'active' ? 'Ativo' : profile.status}
                    </span>
                  </div>
                  <div className="mt-5 flex items-baseline gap-1"><span className="text-2xl font-bold tracking-tight text-white tabular-nums">{profile.kcal || 0}</span><span className="text-xs font-medium text-white/45">/ {profile.goal_calories || 0} kcal</span></div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400 transition-[width]" style={{ width: `${progress}%` }} /></div>
                  <div className="mt-3 flex items-center justify-between text-xs text-white/55">
                    <span>P {profile.protein || 0} / {profile.goal_protein || 0}g</span>
                    <span>Líquido {netCalories} kcal</span>
                  </div>
                  <span className="mt-5 inline-flex items-center text-xs font-bold uppercase tracking-[0.12em] text-emerald-300 transition group-hover:translate-x-0.5">Analisar perfil <span className="ml-1 text-base leading-none">→</span></span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center"><p className="text-sm font-medium text-white/65">Nenhum perfil disponível para o grupo.</p><p className="mt-1 text-xs text-white/40">Quando houver perfis ativos, o acompanhamento aparece aqui.</p></div>
        )}
      </section>
    </div>
  );
}
