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
    <div className="flex items-center gap-2">
      <button
        onClick={() => onEdit(item)}
        className="rounded-full bg-white/10 p-2 text-white/70"
        aria-label={`Editar ${item.description}`}
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        onClick={() => onDelete(item)}
        disabled={deletingItemId === item.id}
        className="rounded-full bg-white/10 p-2 text-red-300 disabled:opacity-60"
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
    <div className="w-full space-y-4 px-4 py-4 lg:px-0">
      <div className="flex items-center justify-between rounded-2xl bg-[#111b21] p-3 lg:px-5">
        <button onClick={onPreviousDate} className="rounded-full bg-white/5 p-2">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <div className="text-xs uppercase tracking-wide text-white/50">Data</div>
          <div className="font-medium">{selectedDate}</div>
        </div>
        <button onClick={onNextDate} className="rounded-full bg-white/5 p-2">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard icon={metricIcons.consumed} label="Consumido" value={`${analytics.summary?.kcal || 0} kcal`} tone="emerald" />
            <MetricCard icon={metricIcons.net} label="Líquido" value={`${netCalories} kcal`} tone="blue" />
            <MetricCard icon={metricIcons.workout} label="Treino" value={`${analytics.workouts?.total || 0} kcal`} tone="amber" />
            <MetricCard icon={metricIcons.sessions} label="Sessões" value={`${analytics.workouts?.count || 0}`} tone="purple" />
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
                {analytics.history?.slice(0, 7).map((day) => {
                  const caloriesBar = getHistoryCaloriesBar(day, analytics.goals?.calories || 1);
                  return (
                    <div key={day.day}>
                      <div className="mb-1 flex items-center justify-between text-xs text-white/65">
                        <span>{formatDayLabel(day.day)}</span>
                        <span>{day.kcal} / {analytics.goals?.calories || 0} kcal</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10">
                        <div className="h-2 rounded-full transition-all" style={{ width: caloriesBar.width, background: caloriesBar.background }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-[#111b21] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white/85">Timeline do dia</h2>
              <p className="mt-1 text-xs text-white/50">Corrige refeições e treinos sem sair daqui.</p>
            </div>
          </div>

          <div className="space-y-2 lg:hidden">
            {analytics.items?.length ? analytics.items.map((item) => (
              <div key={item.id} className="rounded-2xl bg-white/5 p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span>{item.description}</span>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/55">
                        {item.type === 'workout' ? 'Treino' : 'Refeição'}
                      </span>
                      <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-medium tracking-wide text-white/60">
                        {formatTimelineTime(item.logged_at)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-white/55">
                      {item.type === 'workout' ? renderWorkoutDetails(item) : renderMealDetails(item)}
                    </div>
                    {item.notes && <div className="mt-2 text-xs text-white/45">{item.notes}</div>}
                  </div>
                  <TimelineActions item={item} deletingItemId={deletingItemId} onEdit={onEditItem} onDelete={onDeleteItem} />
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
                    {analytics.items.map((item) => (
                      <tr key={`desktop-${item.id}`} className="border-t border-white/10 align-top text-white/85">
                        <td className="px-4 py-3 text-white/60">{formatTimelineTime(item.logged_at)}</td>
                        <td className="px-4 py-3">{item.type === 'workout' ? 'Treino' : 'Refeição'}</td>
                        <td className="px-4 py-3 font-medium">{item.description}</td>
                        <td className="px-4 py-3 text-white/60">
                          <div>{item.type === 'workout' ? renderWorkoutDetails(item) : renderMealDetails(item)}</div>
                          {item.notes && <div className="mt-1 text-xs text-white/40">{item.notes}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <TimelineActions item={item} deletingItemId={deletingItemId} onEdit={onEditItem} onDelete={onDeleteItem} />
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
  );
}
