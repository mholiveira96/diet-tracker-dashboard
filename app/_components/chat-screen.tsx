"use client";

import React from 'react';
import { Save } from 'lucide-react';
import type { ChatAttachment, ChatMessage } from './types';

function formatConfidence(value?: number | null) {
  if (typeof value !== 'number') return null;
  return `${Math.round(value * 100)}%`;
}

function formatActionLabel(action?: string | null) {
  switch (action) {
    case 'log_meal':
      return 'Refeição detectada';
    case 'log_workout':
      return 'Treino detectado';
    case 'clarify':
      return 'Precisa de mais detalhes';
    case 'noop':
      return 'Ainda não entendi o registro';
    default:
      return null;
  }
}

export function ChatScreen({
  displayedMessages,
  stagedAttachments,
  submissionFeedback,
  confirmingMessageId,
  onConfirmDraft,
  messagesEndRef,
}: {
  displayedMessages: ChatMessage[];
  stagedAttachments: ChatAttachment[];
  submissionFeedback: string | null;
  confirmingMessageId: number | null;
  onConfirmDraft: (messageId: number) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-[url('/chat-bg.svg')] bg-cover bg-center px-3 py-4 lg:rounded-[32px]">
      <div className="space-y-3">
        {displayedMessages.map((message) => {
          const isUser = message.role === 'user';
          const normalized = message.metadata?.normalized;
          const isWaiting = message.message_type === 'pending';
          const isOptimistic = Boolean(message.metadata?.optimistic);
          return (
            <div key={String(message.id)} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[88%] rounded-2xl px-3 py-2 shadow ${isUser ? 'bg-[#005c4b]' : 'bg-[#202c33]'} ${isOptimistic ? 'opacity-90' : ''}`}>
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mb-2 grid grid-cols-2 gap-2">
                    {message.attachments.map((attachment) => (
                      <img key={attachment.id} src={attachment.url} alt={attachment.original_name || 'attachment'} className="h-28 w-full rounded-xl object-cover" />
                    ))}
                  </div>
                )}
                {isWaiting ? (
                  <div className="flex items-center gap-2 text-sm text-white/90">
                    <span>{message.text}</span>
                    <span className="inline-flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-300 [animation-delay:-0.2s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-300 [animation-delay:-0.1s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-300" />
                    </span>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-6 text-white">{message.text}</p>
                )}
                {!isUser && normalized && (
                  <div className="mt-2 rounded-xl bg-black/20 p-2 text-xs text-white/80">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium uppercase tracking-wide">{formatActionLabel(normalized.action) || 'Registro analisado'}</span>
                      {formatConfidence(message.confidence) && <span>{formatConfidence(message.confidence)}</span>}
                    </div>
                    {normalized.description && <p className="mt-1">{normalized.description}</p>}
                    {normalized.modality && <p className="mt-1">{normalized.modality}</p>}
                    {typeof normalized.calories === 'number' && <p>🔥 {normalized.calories} kcal</p>}
                    {typeof normalized.protein === 'number' && <p>🥩 {normalized.protein}g proteína</p>}
                    {typeof normalized.carbs === 'number' && <p>🍞 {normalized.carbs}g carbo</p>}
                    {typeof normalized.fat === 'number' && <p>🥑 {normalized.fat}g gordura</p>}
                    {message.message_type === 'draft' && (
                      <button
                        onClick={() => onConfirmDraft(Number(message.id))}
                        disabled={confirmingMessageId === Number(message.id)}
                        className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-400 px-3 py-1 font-medium text-[#0b141a] disabled:opacity-60"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {confirmingMessageId === Number(message.id) ? 'Confirmando...' : 'Confirmar e registrar'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {stagedAttachments.length > 0 && (
        <div className="mt-4 rounded-2xl bg-[#202c33] p-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-white/60">Pronto para registrar</div>
          <div className="grid grid-cols-3 gap-2">
            {stagedAttachments.map((attachment) => (
              <img key={attachment.id} src={attachment.url} alt={attachment.original_name || 'staged'} className="h-20 w-full rounded-xl object-cover" />
            ))}
          </div>
        </div>
      )}

      {submissionFeedback && (
        <div className="mt-4 rounded-2xl bg-black/30 px-3 py-2 text-sm text-emerald-100">
          {submissionFeedback}
        </div>
      )}
    </div>
  );
}
