"use client";

import React from 'react';
import { X } from 'lucide-react';
import analyticsPresentation from '../../lib/analytics/presentation.js';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import type { AnalyticsTimelineItem } from './types';
import { ProfileNumberField } from './shared';

const { formatLoggedAtForInput } = analyticsPresentation as {
  formatLoggedAtForInput: (value?: string | null) => string;
};

export function EditItemModal({
  editingItem,
  editingDraft,
  savingItem,
  onClose,
  onSave,
  onChange,
}: {
  editingItem: AnalyticsTimelineItem | null;
  editingDraft: any;
  savingItem: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (updater: (current: any) => any) => void;
}) {
  if (!editingItem || !editingDraft) return null;

  const isWorkout = editingItem.type === 'workout';

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/60 p-3 lg:items-center lg:justify-center">
      <div className="w-full rounded-[28px] bg-[#111b21] p-4 shadow-2xl lg:max-w-2xl lg:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-emerald-300/80">{isWorkout ? 'Editar treino' : 'Editar refeição'}</div>
            <div className="text-lg font-semibold text-white">{editingItem.description}</div>
          </div>
          <Button onClick={onClose} disabled={savingItem} variant="secondary" className="h-10 w-10 rounded-full p-0 text-white/70">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3">
          <Label>
            <span className="mb-2 block">{isWorkout ? 'Treino' : 'Descrição'}</span>
            <Input
              value={isWorkout ? editingDraft.modality || '' : editingDraft.description || ''}
              onChange={(event) => onChange((current) => current ? {
                ...current,
                ...(isWorkout ? { modality: event.target.value } : { description: event.target.value }),
              } : current)}
            />
          </Label>

          <div className={`grid gap-3 ${isWorkout ? 'grid-cols-2' : 'grid-cols-2'}`}>
            <ProfileNumberField
              label={isWorkout ? 'Duração (min)' : 'Quantidade'}
              value={isWorkout ? Number(editingDraft.duration_min || 0) : Number(editingDraft.amount || 0)}
              onChange={(value) => onChange((current) => current ? {
                ...current,
                ...(isWorkout ? { duration_min: value } : { amount: value }),
              } : current)}
            />
            <ProfileNumberField
              label="Calorias"
              value={Number(editingDraft.calories || 0)}
              onChange={(value) => onChange((current) => current ? { ...current, calories: value } : current)}
            />
          </div>

          <Label>
            <span className="mb-2 block">Horário</span>
            <Input
              type="datetime-local"
              value={formatLoggedAtForInput(editingDraft.logged_at)}
              onChange={(event) => onChange((current) => current ? { ...current, logged_at: event.target.value } : current)}
            />
          </Label>

          {isWorkout ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Label>
                  <span className="mb-2 block">Tipo de treino</span>
                  <Select
                    value={editingDraft.workout_type || 'other'}
                    onChange={(event) => onChange((current) => current ? { ...current, workout_type: event.target.value } : current)}
                  >
                    <option value="strength">Força</option>
                    <option value="cardio">Cardio</option>
                    <option value="mobility">Mobilidade</option>
                    <option value="sports">Esporte</option>
                    <option value="other">Outro</option>
                  </Select>
                </Label>
                <Label>
                  <span className="mb-2 block">Intensidade</span>
                  <Select
                    value={editingDraft.intensity || 'moderate'}
                    onChange={(event) => onChange((current) => current ? { ...current, intensity: event.target.value } : current)}
                  >
                    <option value="low">Leve</option>
                    <option value="moderate">Moderada</option>
                    <option value="high">Alta</option>
                  </Select>
                </Label>
              </div>
              <Label>
                <span className="mb-2 block">Observações</span>
                <Textarea
                  value={editingDraft.notes || ''}
                  onChange={(event) => onChange((current) => current ? { ...current, notes: event.target.value } : current)}
                  placeholder="Ex.: perna, tiros, pace, sensação do treino..."
                  className="min-h-[112px]"
                />
              </Label>
            </>
          ) : (
            <>
              <Label>
                <span className="mb-2 block">Unidade</span>
                <Input
                  value={editingDraft.unit || 'g'}
                  onChange={(event) => onChange((current) => current ? { ...current, unit: event.target.value } : current)}
                />
              </Label>
              <div className="grid grid-cols-3 gap-3">
                <ProfileNumberField label="Proteína" value={Number(editingDraft.protein || 0)} onChange={(value) => onChange((current) => current ? { ...current, protein: value } : current)} />
                <ProfileNumberField label="Carbo" value={Number(editingDraft.carbs || 0)} onChange={(value) => onChange((current) => current ? { ...current, carbs: value } : current)} />
                <ProfileNumberField label="Gordura" value={Number(editingDraft.fat || 0)} onChange={(value) => onChange((current) => current ? { ...current, fat: value } : current)} />
              </div>
            </>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button onClick={onClose} disabled={savingItem} variant="outline" className="w-full">
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={savingItem} className="w-full">
            {savingItem ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
