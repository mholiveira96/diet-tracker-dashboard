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
    <section className="rounded-3xl bg-[#111b21] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-emerald-300" />
          <h2 className="text-sm font-semibold text-white/85">Histórico recente</h2>
        </div>
        <span className="text-xs text-white/45">{events.length} evento{events.length === 1 ? '' : 's'}</span>
      </div>
      {events.length ? (
        <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
          {events.map((event) => (
            <div key={event.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm text-white/80">{eventCopy(event)}</p>
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
        <p className="text-sm text-white/50">As edições e exclusões deste perfil aparecerão aqui.</p>
      )}
    </section>
  );
}
