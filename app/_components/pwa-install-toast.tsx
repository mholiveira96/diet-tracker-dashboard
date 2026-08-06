"use client";

import React from 'react';
import { Download, Share, X } from 'lucide-react';
import pwaInstall from '../../lib/pwa/install.js';

const {
  DISMISSAL_KEY,
  isStandaloneWindow,
  isIosDevice,
  isMobileViewport,
  hasRecentDismissal,
  canShowInstallToast,
} = pwaInstall as {
  DISMISSAL_KEY: string;
  isStandaloneWindow: (windowLike: Window) => boolean;
  isIosDevice: (navigatorLike: Navigator) => boolean;
  isMobileViewport: (windowLike: Window) => boolean;
  hasRecentDismissal: (value: string | null) => boolean;
  canShowInstallToast: (options: { standalone: boolean; mobile: boolean; dismissed: boolean; hasDeferredPrompt: boolean; ios: boolean }) => boolean;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function PwaInstallToast() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = React.useState(false);
  const [standalone, setStandalone] = React.useState(true);
  const [mobile, setMobile] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);
  const [iosHelp, setIosHelp] = React.useState(false);
  const [installing, setInstalling] = React.useState(false);

  React.useEffect(() => {
    const currentWindow = window;
    setStandalone(isStandaloneWindow(currentWindow));
    setMobile(isMobileViewport(currentWindow));
    setIos(isIosDevice(currentWindow.navigator));
    setDismissed(hasRecentDismissal(currentWindow.localStorage.getItem(DISMISSAL_KEY)));

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setDismissed(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const visible = canShowInstallToast({
    standalone,
    mobile,
    dismissed,
    hasDeferredPrompt: Boolean(deferredPrompt),
    ios,
  });

  if (!visible) return null;

  function dismiss() {
    window.localStorage.setItem(DISMISSAL_KEY, String(Date.now()));
    setDismissed(true);
  }

  async function install() {
    if (ios) {
      setIosHelp(true);
      return;
    }
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (choice.outcome === 'accepted') setDismissed(true);
    } finally {
      setInstalling(false);
    }
  }

  return (
    <aside className="fixed bottom-4 right-4 z-40 w-[min(360px,calc(100vw-2rem))] rounded-[24px] border border-[#efd7e3] bg-white/95 p-4 text-[#432238] shadow-[0_18px_60px_rgba(103,43,77,.18)] backdrop-blur-xl" aria-live="polite">
      <button type="button" onClick={dismiss} aria-label="Fechar aviso de instalação" className="absolute right-2 top-2 rounded-xl p-2 text-[#9a788b] transition-colors hover:bg-pink-50 hover:text-[#432238]"><X className="h-4 w-4" /></button>
      <div className="flex gap-3 pr-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-pink-500"><img src="/icons/icon-192.png" alt="" className="h-full w-full object-cover" /></div>
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-pink-600">Hunger Games</p><p className="mt-1 text-sm font-semibold">Instale no seu celular</p><p className="mt-0.5 text-xs leading-5 text-[#816176]">Acesso rápido, mesmo quando a rotina apertar.</p></div>
      </div>
      {iosHelp ? <div className="mt-3 rounded-2xl bg-[#fff3f8] p-3 text-xs leading-5 text-[#76556b]"><p className="font-semibold text-[#572b47]">No iPhone ou iPad</p><p className="mt-1">Toque em <Share className="mx-0.5 inline h-3.5 w-3.5 align-[-2px]" /> Compartilhar e depois em <strong>Adicionar à Tela de Início</strong>.</p></div> : <button type="button" onClick={install} disabled={installing} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl bg-pink-500 px-3 text-sm font-bold text-white transition-colors hover:bg-pink-600 disabled:opacity-60"><Download className="h-4 w-4" />{installing ? 'Abrindo instalação...' : ios ? 'Como instalar' : 'Instalar agora'}</button>}
    </aside>
  );
}
