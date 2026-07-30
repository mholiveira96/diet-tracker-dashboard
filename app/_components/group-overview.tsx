"use client";

import React from 'react';
import type { GroupOverviewItem } from './types';

export function GroupOverview({
  overview,
  selectedDate,
  onSelectProfile,
}: {
  overview: GroupOverviewItem[];
  selectedDate: string;
  onSelectProfile: (profileId: number) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-4 lg:px-0">
      <section className="rounded-3xl bg-[#111b21] p-4 lg:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-emerald-300/80">Visão do grupo</p>
            <h2 className="mt-1 text-lg font-semibold">Acompanhamento de hoje</h2>
          </div>
          <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/60">{selectedDate}</span>
        </div>

        {overview.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {overview.map((profile) => {
              const netCalories = Number(profile.kcal || 0) - Number(profile.workout_kcal || 0);
              return (
                <button
                  key={profile.id}
                  onClick={() => onSelectProfile(profile.id)}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-emerald-300/40 hover:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-white">{profile.display_name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${profile.status === 'active' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/10 text-white/50'}`}>
                      {profile.status === 'active' ? 'Ativo' : profile.status}
                    </span>
                  </div>
                  <div className="mt-4 text-2xl font-semibold text-emerald-300">{profile.kcal || 0}<span className="ml-1 text-xs font-medium text-white/45">/ {profile.goal_calories || 0} kcal</span></div>
                  <div className="mt-2 flex items-center justify-between text-xs text-white/55">
                    <span>P {profile.protein || 0} / {profile.goal_protein || 0}g</span>
                    <span>Líquido {netCalories} kcal</span>
                  </div>
                  <span className="mt-4 inline-block text-xs font-medium text-emerald-300">Abrir perfil →</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-white/55">Nenhum perfil disponível para o grupo.</p>
        )}
      </section>
    </div>
  );
}
