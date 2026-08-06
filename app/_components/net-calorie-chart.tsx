"use client";

import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type HistoryDay = {
  day: string;
  kcal: number;
  workouts_kcal: number;
  net_kcal: number;
};

type RangeDays = 7 | 14 | 30;

type ChartPoint = HistoryDay & { label: string; goal: number };

function formatDayLabel(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(`${value}T12:00:00-03:00`)).replace('.', '');
}

function formatKcal(value: number) {
  return Math.round(value).toLocaleString('pt-BR');
}

function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: ChartPoint }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-2xl border border-[#efd7e3] bg-white/95 px-3 py-2.5 text-xs shadow-[0_12px_28px_rgba(103,43,77,.12)] backdrop-blur">
      <p className="font-semibold text-[#432238]">{label}</p>
      <div className="mt-2 space-y-1 text-[#76556b]">
        <p><span className="font-medium text-[#bb2d70]">Líquido</span>: {formatKcal(point.net_kcal)} kcal</p>
        <p>Consumido: {formatKcal(point.kcal)} kcal</p>
        <p>Treino ativo: -{formatKcal(point.workouts_kcal)} kcal</p>
        <p>Meta: {formatKcal(point.goal)} kcal</p>
      </div>
    </div>
  );
}

export function NetCaloriesChart({
  history,
  goalCalories,
}: {
  history: HistoryDay[];
  goalCalories: number;
}) {
  const [range, setRange] = React.useState<RangeDays>(7);
  const goal = Number(goalCalories || 0);
  const data: ChartPoint[] = history.slice(0, range).reverse().map((day) => ({
    ...day,
    label: formatDayLabel(day.day),
    goal,
  }));
  const latest = data[data.length - 1];
  const difference = latest ? latest.net_kcal - goal : 0;

  return (
    <div className="rounded-[28px] border border-[#efd7e3] bg-white/54 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-pink-600">Energia líquida</p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[#432238]">Tendência dos últimos dias</h2>
          <p className="mt-1 text-xs text-[#8b687c]">Ingestão menos calorias ativas do treino.</p>
        </div>
        <div className="flex rounded-xl border border-[#efd7e3] bg-[#fff8fc] p-1" aria-label="Período da tendência">
          {[7, 14, 30].map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setRange(days as RangeDays)}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${range === days ? 'bg-pink-500 text-white' : 'text-[#8b687c] hover:bg-pink-50 hover:text-[#572b47]'}`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 h-64 w-full">
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="netCaloriesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e83d88" stopOpacity={0.34} />
                  <stop offset="100%" stopColor="#e83d88" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#efdce6" strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#9a788b', fontSize: 10 }} minTickGap={24} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: '#9a788b', fontSize: 10 }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} width={32} />
              <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#e83d88', strokeOpacity: 0.22 }} />
              {goal > 0 && <ReferenceLine y={goal} stroke="#9c6b86" strokeDasharray="5 5" strokeOpacity={0.72} />}
              <Area type="monotone" dataKey="net_kcal" stroke="#d92e78" strokeWidth={3} fill="url(#netCaloriesFill)" dot={{ r: 3, fill: '#d92e78', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#d92e78', stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[#efd7e3] text-sm text-[#8b687c]">Ainda não há dados suficientes para a tendência.</div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#8b687c]">
        <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-pink-500" />Líquido</span>
        <span>{latest ? `${difference > 0 ? '+' : ''}${formatKcal(difference)} kcal vs. meta no último dia` : 'Sem lançamento recente'}</span>
      </div>
    </div>
  );
}
