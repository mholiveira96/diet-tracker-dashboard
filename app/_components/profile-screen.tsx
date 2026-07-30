"use client";

import React from 'react';
import { Button } from '../../components/ui/button';
import { Select } from '../../components/ui/select';
import { ProfileNumberField } from './shared';
import { AuditPanel } from './audit-panel';
import type { AuditEvent, GoalsState, PreferencesState } from './types';

export function ProfileScreen({
  goals,
  preferences,
  savingProfile,
  onGoalsChange,
  onPreferencesChange,
  onSave,
  auditEvents,
  restoringAuditId,
  onRestoreAudit,
}: {
  goals: GoalsState;
  preferences: PreferencesState;
  savingProfile: boolean;
  onGoalsChange: (next: GoalsState) => void;
  onPreferencesChange: (next: PreferencesState) => void;
  onSave: () => void;
  auditEvents: AuditEvent[];
  restoringAuditId: number | null;
  onRestoreAudit: (event: AuditEvent) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-5 lg:px-0 lg:py-7">
      <section className="rounded-2xl border border-white/[0.08] bg-[#111b21] p-5 shadow-[0_12px_35px_rgba(0,0,0,0.16)]">
        <div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300/80">Ponto de partida</p><h2 className="mt-1 text-base font-semibold">Metas diárias</h2><p className="mt-1 text-xs text-white/45">Defina referências objetivas para acompanhar o dia.</p></div>
        <div className="grid grid-cols-2 gap-4">
          <ProfileNumberField label="Calorias" value={goals.calories} max={20000} onChange={(value) => onGoalsChange({ ...goals, calories: value })} />
          <ProfileNumberField label="Proteína" value={goals.protein} max={1000} onChange={(value) => onGoalsChange({ ...goals, protein: value })} />
          <ProfileNumberField label="Carbo" value={goals.carbs} max={1000} onChange={(value) => onGoalsChange({ ...goals, carbs: value })} />
          <ProfileNumberField label="Gordura" value={goals.fat} max={1000} onChange={(value) => onGoalsChange({ ...goals, fat: value })} />
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.08] bg-[#111b21] p-5">
        <div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-300/80">Preferências</p><h2 className="mt-1 text-base font-semibold">Como registrar</h2><p className="mt-1 text-xs text-white/45">Ajuste o nível de confirmação e a retenção das imagens.</p></div>
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/55">Como a IA deve agir</div>
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

      <Button onClick={onSave} disabled={savingProfile} className="h-12 w-full font-semibold shadow-[0_10px_28px_rgba(16,185,129,0.18)]">
        {savingProfile ? 'Salvando ajustes...' : 'Salvar ajustes'}
      </Button>

      <AuditPanel events={auditEvents} restoringAuditId={restoringAuditId} onRestore={onRestoreAudit} />
    </div>
  );
}
