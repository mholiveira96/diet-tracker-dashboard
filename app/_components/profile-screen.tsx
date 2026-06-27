"use client";

import React from 'react';
import { Button } from '../../components/ui/button';
import { Select } from '../../components/ui/select';
import { ProfileNumberField } from './shared';
import type { GoalsState, PreferencesState } from './types';

export function ProfileScreen({
  goals,
  preferences,
  savingProfile,
  onGoalsChange,
  onPreferencesChange,
  onSave,
}: {
  goals: GoalsState;
  preferences: PreferencesState;
  savingProfile: boolean;
  onGoalsChange: (next: GoalsState) => void;
  onPreferencesChange: (next: PreferencesState) => void;
  onSave: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-4 lg:px-0">
      <section className="rounded-3xl bg-[#111b21] p-4">
        <h2 className="mb-3 text-sm font-semibold text-white/85">Metas diárias</h2>
        <div className="grid grid-cols-2 gap-3">
          <ProfileNumberField label="Calorias" value={goals.calories} max={20000} onChange={(value) => onGoalsChange({ ...goals, calories: value })} />
          <ProfileNumberField label="Proteína" value={goals.protein} max={1000} onChange={(value) => onGoalsChange({ ...goals, protein: value })} />
          <ProfileNumberField label="Carbo" value={goals.carbs} max={1000} onChange={(value) => onGoalsChange({ ...goals, carbs: value })} />
          <ProfileNumberField label="Gordura" value={goals.fat} max={1000} onChange={(value) => onGoalsChange({ ...goals, fat: value })} />
        </div>
      </section>

      <section className="rounded-3xl bg-[#111b21] p-4">
        <h2 className="mb-3 text-sm font-semibold text-white/85">Preferências do chat</h2>
        <div className="space-y-3">
          <div>
            <div className="mb-2 text-sm text-white/75">Como a IA deve agir</div>
            <Select
              value={preferences.parserMode}
              onChange={(event) => onPreferencesChange({ ...preferences, parserMode: event.target.value as PreferencesState['parserMode'] })}
            >
              <option value="conservative">Confere antes de registrar</option>
              <option value="balanced">Equilibra confirmação e rapidez</option>
              <option value="aggressive">Registra direto sempre que der</option>
            </Select>
          </div>
          <ProfileNumberField
            label="Retenção de imagens (dias)"
            value={preferences.imageRetentionDays}
            min={1}
            max={3650}
            onChange={(value) => onPreferencesChange({ ...preferences, imageRetentionDays: value })}
          />
        </div>
      </section>

      <Button onClick={onSave} disabled={savingProfile} className="w-full">
        {savingProfile ? 'Salvando ajustes...' : 'Salvar ajustes'}
      </Button>
    </div>
  );
}
