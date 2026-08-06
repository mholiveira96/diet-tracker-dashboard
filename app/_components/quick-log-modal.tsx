"use client";

import React from 'react';
import { Dumbbell, Utensils, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

export type QuickLogType = 'meal' | 'workout';

export type QuickLogPayload = {
  type: QuickLogType;
  data: Record<string, string | number>;
};

const initialMeal = { description: '', amount: 1, unit: 'porção', calories: 0, protein: 0, carbs: 0, fat: 0 };
const initialWorkout = { modality: '', duration_min: 30, calories: 0 };

export function QuickLogModal({
  open,
  type,
  saving,
  onTypeChange,
  onClose,
  onSave,
}: {
  open: boolean;
  type: QuickLogType;
  saving: boolean;
  onTypeChange: (type: QuickLogType) => void;
  onClose: () => void;
  onSave: (payload: QuickLogPayload) => void;
}) {
  const [meal, setMeal] = React.useState(initialMeal);
  const [workout, setWorkout] = React.useState(initialWorkout);

  React.useEffect(() => {
    if (open) {
      setMeal(initialMeal);
      setWorkout(initialWorkout);
    }
  }, [open]);

  if (!open) return null;

  const canSave = type === 'meal'
    ? Boolean(meal.description.trim()) && meal.calories > 0
    : Boolean(workout.modality.trim()) && workout.duration_min > 0 && workout.calories > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#432238]/20 p-3 backdrop-blur-sm sm:items-center">
      <div role="dialog" aria-modal="true" aria-labelledby="quick-log-title" className="ios-surface w-full max-w-lg rounded-[30px] bg-white/90 p-5 shadow-[0_24px_70px_rgba(89,33,68,.22)] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-pink-600">Registro rápido</p>
            <h2 id="quick-log-title" className="mt-1 text-xl font-semibold tracking-[-0.04em] text-[#432238]">Adicionar ao dia</h2>
            <p className="mt-1 text-sm text-[#816176]">Informe os dados explícitos e o registro entra na linha do dia.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar registro rápido" className="rounded-xl p-2 text-[#8b687c] hover:bg-pink-50 hover:text-[#432238]"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-[#fff3f8] p-1">
          <button type="button" onClick={() => onTypeChange('meal')} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors ${type === 'meal' ? 'bg-white text-pink-600 shadow-sm' : 'text-[#8b687c]'}`}><Utensils className="h-4 w-4" /> Refeição</button>
          <button type="button" onClick={() => onTypeChange('workout')} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors ${type === 'workout' ? 'bg-white text-pink-600 shadow-sm' : 'text-[#8b687c]'}`}><Dumbbell className="h-4 w-4" /> Treino</button>
        </div>

        {type === 'meal' ? (
          <div className="mt-5 space-y-4">
            <Field label="Descrição"><Input autoFocus value={meal.description} placeholder="Ex.: almoço, banana, sanduíche" onChange={(event) => setMeal({ ...meal, description: event.target.value })} /></Field>
            <div className="grid grid-cols-[1fr_1.2fr] gap-3"><Field label="Quantidade"><Input type="number" min={0} step="any" value={meal.amount} onChange={(event) => setMeal({ ...meal, amount: Number(event.target.value) })} /></Field><Field label="Unidade"><Input value={meal.unit} onChange={(event) => setMeal({ ...meal, unit: event.target.value })} /></Field></div>
            <Field label="Calorias"><Input type="number" min={0} value={meal.calories || ''} placeholder="Obrigatório" onChange={(event) => setMeal({ ...meal, calories: Number(event.target.value) })} /></Field>
            <div className="grid grid-cols-3 gap-3"><Field label="Proteína (g)"><Input type="number" min={0} step="any" value={meal.protein} onChange={(event) => setMeal({ ...meal, protein: Number(event.target.value) })} /></Field><Field label="Carbo (g)"><Input type="number" min={0} step="any" value={meal.carbs} onChange={(event) => setMeal({ ...meal, carbs: Number(event.target.value) })} /></Field><Field label="Gordura (g)"><Input type="number" min={0} step="any" value={meal.fat} onChange={(event) => setMeal({ ...meal, fat: Number(event.target.value) })} /></Field></div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <Field label="Modalidade"><Input autoFocus value={workout.modality} placeholder="Ex.: corrida, musculação, bike" onChange={(event) => setWorkout({ ...workout, modality: event.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3"><Field label="Duração (min)"><Input type="number" min={1} value={workout.duration_min} onChange={(event) => setWorkout({ ...workout, duration_min: Number(event.target.value) })} /></Field><Field label="Calorias ativas"><Input type="number" min={0} value={workout.calories || ''} placeholder="Obrigatório" onChange={(event) => setWorkout({ ...workout, calories: Number(event.target.value) })} /></Field></div>
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} className="border-[#efd7e3] text-[#76556b] hover:bg-pink-50">Cancelar</Button>
          <Button onClick={() => onSave(type === 'meal' ? { type, data: meal } : { type, data: workout })} disabled={!canSave || saving} className="bg-pink-500 text-white hover:bg-pink-600">{saving ? 'Salvando...' : 'Registrar agora'}</Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <Label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-[#76556b]">{label}</span>{children}</Label>;
}
