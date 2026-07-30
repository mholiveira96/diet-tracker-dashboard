"use client";

import React from 'react';
import { History, RotateCcw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import type { AuditEvent } from './types';

function eventCopy(event: AuditEvent) {
  const entity = event.entity_type === 'workout' ? 'Treino' : 'Refeição';
  const action = event.action === 'delete' ? 'apagada' : event.action === 'restore' ? 'restaurada' : 'atualizada';
  return `${entity} ${action}`;
}

function eventTime(value: string) {
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(date);
}

export function AuditPanel({
  events,
  restoringAuditId,
  onRestore,
}: {
  events: AuditEvent[];
  restoringAuditId: number | null;
  onRestore: (event: AuditEvent) => void;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#111b21] p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-emerald-300/15 bg-emerald-300/10 p-2"><History className="h-4 w-4 text-emerald-300" /></div>
          <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300/80">Transparência</p><h2 className="mt-0.5 text-base font-semibold">Histórico recente</h2></div>
        </div>
        <span className="rounded-md border border-white/[0.08] bg-black/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/50">{events.length} evento{events.length === 1 ? '' : 's'}</span>
      </div>
      {events.length ? (
        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {events.map((event) => (
            <div key={event.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white/80">{eventCopy(event)}</p>
                <p className="mt-0.5 text-xs text-white/45">{eventTime(event.created_at)}</p>
              </div>
              {event.action === 'delete' && !event.reverted_audit_event_id && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (window.confirm('Restaurar este registro? A restauração será pública e ficará registrada no histórico.')) onRestore(event);
                  }}
                  disabled={restoringAuditId === event.id}
                  className="shrink-0 px-3 py-2 text-xs"
                >
                  <RotateCcw className="mr-1 h-3.5 w-3.5" />
                  {restoringAuditId === event.id ? 'Restaurando' : 'Restaurar'}
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.025] px-4 py-7 text-center"><p className="text-sm font-medium text-white/60">Nenhuma alteração recente.</p><p className="mt-1 text-xs text-white/40">Edições e exclusões deste perfil ficam registradas aqui.</p></div>
      )}
    </section>
  );
}
