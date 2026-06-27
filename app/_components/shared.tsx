"use client";

import React from 'react';
import { Activity, BarChart3, Flame, Timer } from 'lucide-react';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';

export function metricCardTone(tone: string) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500/20 to-emerald-300/5',
    blue: 'from-sky-500/20 to-sky-300/5',
    amber: 'from-amber-500/20 to-amber-300/5',
    purple: 'from-violet-500/20 to-violet-300/5',
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
    <div className={`rounded-3xl bg-gradient-to-br ${metricCardTone(tone)} p-4`}>
      <div className="mb-3 inline-flex rounded-2xl bg-white/10 p-2"><Icon className="h-4 w-4" /></div>
      <div className="text-xs uppercase tracking-wide text-white/55">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function macroProgress(value: number, goal: number) {
  if (!goal) return 0;
  return Math.max(0, Math.min(100, Math.round((value / goal) * 100)));
}

export function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-white/60">{value} / {goal}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${macroProgress(Number(value || 0), Number(goal || 1))}%` }} />
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
      <span className="mb-2 block">{label}</span>
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
