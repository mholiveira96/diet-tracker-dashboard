"use client";

import React from 'react';
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import analyticsPresentation from '../../lib/analytics/presentation.js';
import type { AnalyticsData, AnalyticsTimelineItem } from './types';
import { MacroBar, MetricCard, metricIcons } from './shared';

const { formatTimelineTime, getHistoryCaloriesBar } = analyticsPresentation as {
  formatTimelineTime: (value?: string) => string;
  getHistoryCaloriesBar: (day: any, goalCalories: number) => { width: string; background: string; tone: string };
};

function formatDayLabel(day: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(`${day}T12:00:00-03:00`));
}

function renderWorkoutDetails(item: AnalyticsTimelineItem) {
  const parts = [`${item.amount || 0} min`, `${item.calories} kcal`];
  if (item.workout_type) parts.push(item.workout_type);
  if (item.intensity) parts.push(item.intensity);
  return parts.join(' • ');
}

function renderMealDetails(item: AnalyticsTimelineItem) {
  return `${item.amount || 0}${item.unit || 'g'} • ${item.calories} kcal • P ${item.protein || 0}g • C ${item.carbs || 0}g • G ${item.fat || 0}g`;
}

function EmptyTimeline({ desktop = false }: { desktop?: boolean }) {
  return (
    <div className={`rounded-xl border border-dashed border-white/10 bg-white/[0.025] px-4 text-center ${desktop ? 'py-10' : 'py-8'}`}>
      <p className="text-sm font-medium text-white/65">Nenhum registro neste dia.</p>
      <p className="mt-1 text-xs text-white/40">A alimentação e os treinos aparecerão aqui quando forem lançados.</p>
    </div>
  );
}

function TimelineActions({
  item,
  deletingItemId,
  onEdit,
  onDelete,
}: {
  item: AnalyticsTimelineItem;
  deletingItemId: string | number | null;
  onEdit: (item: AnalyticsTimelineItem) => void;
  onDelete: (item: AnalyticsTimelineItem) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onEdit(item)}
        className="rounded-lg border border-white/[0.08] bg-white/[0.06] p-2 text-white/70 transition hover:border-emerald-300/30 hover:bg-emerald-300/10 hover:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
        aria-label={`Editar ${item.description}`}
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        onClick={() => onDelete(item)}
        disabled={deletingItemId === item.id}
        className="rounded-lg border border-white/[0.08] bg-white/[0.06] p-2 text-red-300 transition hover:border-red-300/30 hover:bg-red-400/10 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-red-400/40"
        aria-label={`Apagar ${item.description}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function AnalyticsScreen({
  analytics,
  selectedDate,
  netCalories,
  deletingItemId,
  onPreviousDate,
  onNextDate,
  onEditItem,
  onDeleteItem,
}: {
  analytics: AnalyticsData;
  selectedDate: string;
  netCalories: number;
  deletingItemId: string | number | null;
  onPreviousDate: () => void;
  onNextDate: () => void;
  onEditItem: (item: AnalyticsTimelineItem) => void;
  onDeleteItem: (item: AnalyticsTimelineItem) => void;
}) {
  return (
    <div className="w-full space-y-5 px-4 py-5 lg:px-0 lg:py-7">
      <div className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[#111b21] p-3 shadow-[0_12px_35px_rgba(0,0,0,0.16)] lg:px-5">
        <button onClick={onPreviousDate} className="rounded-lg border border-white/[0.08] bg-white/[0.05] p-2 transition hover:border-emerald-300/30 hover:bg-emerald-300/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40" aria-label="Ver dia anterior">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300/75">Diário de performance</div>
          <div className="mt-0.5 font-semibold tabular-nums">{selectedDate}</div>
        </div>
        <button onClick={onNextDate} className="rounded-lg border border-white/[0.08] bg-white/[0.05] p-2 transition hover:border-emerald-300/30 hover:bg-emerald-300/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40" aria-label="Ver próximo dia">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)]">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard icon={metricIcons.consumed} label="Consumido" value={`${analytics.summary?.kcal || 0} kcal`} tone="emerald" />
            <MetricCard icon={metricIcons.net} label="Líquido" value={`${netCalories} kcal`} tone="blue" />
            <MetricCard icon={metricIcons.workout} label="Treino" value={`${analytics.workouts?.total || 0} kcal`} tone="amber" />
            <MetricCard icon={metricIcons.sessions} label="Sessões" value={`${analytics.workouts?.count || 0}`} tone="purple" />
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.95fr)]">
            <div className="rounded-2xl border border-white/[0.08] bg-[#111b21] p-5">
              <div className="mb-5 flex items-end justify-between gap-3">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300/80">Nutrição</p><h2 className="mt-1 text-base font-semibold">Macros do dia</h2></div>
                <span className="text-xs text-white/45">Meta vs. realizado</span>
              </div>
              <MacroBar label="Proteína" value={analytics.summary?.protein || 0} goal={analytics.goals?.protein || 1} color="bg-emerald-400" />
              <MacroBar label="Carbo" value={analytics.summary?.carbs || 0} goal={analytics.goals?.carbs || 1} color="bg-sky-400" />
              <MacroBar label="Gordura" value={analytics.summary?.fat || 0} goal={analytics.goals?.fat || 1} color="bg-amber-400" />
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#111b21] p-5">
              <div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-300/80">Tendência</p><h2 className="mt-1 text-base font-semibold">Últimos 7 dias</h2></div>
              <div className="space-y-4">
                {analytics.history?.slice(0, 7).map((day) => {
                  const caloriesBar = getHistoryCaloriesBar(day, analytics.goals?.calories || 1);
                  return (
                    <div key={day.day}>
                      <div className="mb-1.5 flex items-center justify-between text-xs text-white/65">
                        <span className="font-medium capitalize">{formatDayLabel(day.day)}</span>
                        <span className="tabular-nums">{day.net_kcal} <span className="text-white/30">/</span> {analytics.goals?.calories || 0} kcal líquidas</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-black/25 ring-1 ring-white/[0.06]">
                        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: caloriesBar.width, background: caloriesBar.background }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#111b21] p-5">
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300/80">Registro auditável</p>
            <h2 className="mt-1 text-base font-semibold">Linha do dia</h2>
            <p className="mt-1 text-xs text-white/50">Revise refeições e treinos com responsabilidade.</p>
          </div>

          <div className="space-y-2 lg:hidden">
            {analytics.items?.length ? analytics.items.map((item) => (
              <div key={item.id} className="settle-in rounded-xl border border-white/[0.07] bg-white/[0.035] p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{item.description}</span>
                      <span className="rounded-md bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white/55">{item.type === 'workout' ? 'Treino' : 'Refeição'}</span>
                      <span className="rounded-md bg-black/20 px-2 py-0.5 text-[10px] font-medium tabular-nums text-white/60">{formatTimelineTime(item.logged_at)}</span>
                    </div>
                    <div className="mt-1.5 text-xs leading-relaxed text-white/55">{item.type === 'workout' ? renderWorkoutDetails(item) : renderMealDetails(item)}</div>
                    {item.notes && <div className="mt-2 text-xs leading-relaxed text-white/45">{item.notes}</div>}
                  </div>
                  <TimelineActions item={item} deletingItemId={deletingItemId} onEdit={onEditItem} onDelete={onDeleteItem} />
                </div>
              </div>
            )) : <EmptyTimeline />}
          </div>

          <div className="hidden lg:block">
            {analytics.items?.length ? (
              <div className="overflow-hidden rounded-xl border border-white/[0.08]">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/[0.045] text-left text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">
                    <tr>
                      <th className="px-4 py-3 font-medium">Hora</th><th className="px-4 py-3 font-medium">Tipo</th><th className="px-4 py-3 font-medium">Descrição</th><th className="px-4 py-3 font-medium">Detalhes</th><th className="px-4 py-3 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.items.map((item) => (
                      <tr key={`desktop-${item.id}`} className="settle-in border-t border-white/[0.07] align-top text-white/85 transition hover:bg-white/[0.025]">
                        <td className="px-4 py-3.5 tabular-nums text-white/60">{formatTimelineTime(item.logged_at)}</td>
                        <td className="px-4 py-3.5">{item.type === 'workout' ? 'Treino' : 'Refeição'}</td>
                        <td className="px-4 py-3.5 font-medium">{item.description}</td>
                        <td className="px-4 py-3.5 text-white/60"><div>{item.type === 'workout' ? renderWorkoutDetails(item) : renderMealDetails(item)}</div>{item.notes && <div className="mt-1 text-xs text-white/40">{item.notes}</div>}</td>
                        <td className="px-4 py-3.5"><div className="flex justify-end"><TimelineActions item={item} deletingItemId={deletingItemId} onEdit={onEditItem} onDelete={onDeleteItem} /></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyTimeline desktop />}
          </div>
        </div>
      </div>
    </div>
  );
}
