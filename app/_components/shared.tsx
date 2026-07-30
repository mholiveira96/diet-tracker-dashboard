"use client";

import React from 'react';
import { Activity, BarChart3, Flame, Timer } from 'lucide-react';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';

export function metricCardTone(tone: string) {
  const tones: Record<string, string> = {
    emerald: 'border-emerald-300/20 from-emerald-400/16 via-emerald-400/5 to-transparent text-emerald-100',
    blue: 'border-sky-300/20 from-sky-400/16 via-sky-400/5 to-transparent text-sky-100',
    amber: 'border-amber-300/20 from-amber-400/16 via-amber-400/5 to-transparent text-amber-100',
    purple: 'border-violet-300/20 from-violet-400/16 via-violet-400/5 to-transparent text-violet-100',
  };

  return tones[tone] || tones.emerald;
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 shadow-[0_12px_30px_rgba(0,0,0,0.16)] ${metricCardTone(tone)}`}>
      <div aria-hidden="true" className="absolute right-0 top-0 h-16 w-16 -translate-y-7 translate-x-7 rounded-full bg-white/[0.07]" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">{label}</div>
          <div className="mt-2 text-xl font-bold tracking-tight text-white tabular-nums">{value}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/15 p-2"><Icon className="h-4 w-4" /></div>
      </div>
    </div>
  );
}

function macroProgress(value: number, goal: number) {
  if (!goal) return 0;
  return Math.max(0, Math.min(100, Math.round((value / goal) * 100)));
}

export function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-2 flex items-center justify-between gap-4 text-sm">
        <span className="font-medium text-white/85">{label}</span>
        <span className="shrink-0 text-xs tabular-nums text-white/55">{value} <span className="text-white/30">/</span> {goal}g</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/25 ring-1 ring-white/[0.06]">
        <div className={`h-full rounded-full transition-[width] duration-500 ${color}`} style={{ width: `${macroProgress(Number(value || 0), Number(goal || 1))}%` }} />
      </div>
    </div>
  );
}

export function ProfileNumberField({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <Label>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-white/55">{label}</span>
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value || 0))}
      />
    </Label>
  );
}

export const metricIcons = {
  consumed: Flame,
  net: Activity,
  workout: Timer,
  sessions: BarChart3,
};
