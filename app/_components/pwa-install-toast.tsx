"use client";

import React from 'react';
import { CheckCircle2, Download, Share, Smartphone, X } from 'lucide-react';
import pwaInstall from '../../lib/pwa/install.js';

const {
  DISMISSAL_KEY,
  isStandaloneWindow,
  isIosDevice,
  isMobileViewport,
  hasRecentDismissal,
  canShowInstallToast,
  captureInstallPrompt,
  clearDeferredPrompt,
  subscribeInstallPrompt,
  promptInstall,
} = pwaInstall as {
  DISMISSAL_KEY: string;
  isStandaloneWindow: (windowLike: Window) => boolean;
  isIosDevice: (navigatorLike: Navigator) => boolean;
  isMobileViewport: (windowLike: Window) => boolean;
  hasRecentDismissal: (value: string | null) => boolean;
  canShowInstallToast: (options: { standalone: boolean; mobile: boolean; dismissed: boolean; hasDeferredPrompt: boolean; ios: boolean }) => boolean;
  captureInstallPrompt: (event: BeforeInstallPromptEvent) => void;
  clearDeferredPrompt: () => void;
  subscribeInstallPrompt: (listener: (event: BeforeInstallPromptEvent | null) => void) => () => void;
  promptInstall: () => Promise<{ outcome: 'accepted' | 'dismissed' } | null>;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function usePwaInstallState() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = React.useState(false);
  const [standalone, setStandalone] = React.useState(true);
  const [mobile, setMobile] = React.useState(false);

  React.useEffect(() => {
    setStandalone(isStandaloneWindow(window));
    setMobile(isMobileViewport(window));
    setIos(isIosDevice(window.navigator));

    const unsubscribe = subscribeInstallPrompt(setDeferredPrompt);
    const handleBeforeInstallPrompt = (event: Event) => captureInstallPrompt(event as BeforeInstallPromptEvent);
    const handleAppInstalled = () => {
      clearDeferredPrompt();
      setStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      unsubscribe();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return { deferredPrompt, ios, standalone, mobile };
}

function useInstallAction() {
  const [installing, setInstalling] = React.useState(false);

  async function install() {
    setInstalling(true);
    try {
      return await promptInstall();
    } finally {
      setInstalling(false);
    }
  }

  return { installing, install };
}

export function PwaInstallButton() {
  const { deferredPrompt, ios, standalone, mobile } = usePwaInstallState();
  const { installing, install } = useInstallAction();
  const [installHelp, setInstallHelp] = React.useState(false);
  const canInstall = !standalone && (Boolean(deferredPrompt) || mobile);
  const InstallIcon = standalone ? CheckCircle2 : Download;

  async function handleInstall() {
    if (!deferredPrompt) {
      setInstallHelp(true);
      return;
    }
    const choice = await install();
    if (choice?.outcome === 'accepted') setInstallHelp(false);
  }

  return (
    <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4" aria-live="polite">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/15 text-pink-300"><Smartphone className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white">Instalar o Hunger Games</p><p className="mt-1 text-xs leading-5 text-white/45">Abra como aplicativo para acessar mais rápido e usar uma janela dedicada.</p></div>
      </div>
      {installHelp ? <div className="mt-3 rounded-xl bg-pink-500/10 p-3 text-xs leading-5 text-white/65"><p className="font-semibold text-pink-200">Como instalar</p><p className="mt-1">{ios ? <>Toque em <Share className="mx-0.5 inline h-3.5 w-3.5 align-[-2px]" /> Compartilhar e depois em <strong className="text-white">Adicionar à Tela de Início</strong>.</> : <>Abra o menu do navegador e escolha <strong className="text-white">Instalar aplicativo</strong> ou <strong className="text-white">Adicionar à tela inicial</strong>.</>}</p></div> : <button type="button" onClick={handleInstall} disabled={standalone || !canInstall || installing} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-pink-500 px-4 text-sm font-bold text-white transition-colors hover:bg-pink-600 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"><InstallIcon className="h-4 w-4" />{standalone ? 'Aplicativo já instalado' : installing ? 'Abrindo instalação...' : deferredPrompt ? 'Instalar aplicativo' : 'Como instalar'}</button>}
      {standalone && <p className="mt-2 flex items-center justify-center gap-1 text-center text-[11px] text-emerald-300/80"><CheckCircle2 className="h-3.5 w-3.5" /> Hunger Games já está instalado</p>}
    </div>
  );
}

export function PwaInstallToast() {
  const { deferredPrompt, ios, standalone, mobile } = usePwaInstallState();
  const { installing, install } = useInstallAction();
  const [dismissed, setDismissed] = React.useState(false);
  const [installHelp, setInstallHelp] = React.useState(false);

  React.useEffect(() => {
    setDismissed(hasRecentDismissal(window.localStorage.getItem(DISMISSAL_KEY)));
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

  async function handleInstall() {
    if (ios || !deferredPrompt) {
      setInstallHelp(true);
      return;
    }
    const choice = await install();
    if (choice?.outcome === 'accepted') setDismissed(true);
  }

  return (
    <aside className="fixed bottom-4 right-4 z-40 w-[min(360px,calc(100vw-2rem))] rounded-[24px] border border-[#efd7e3] bg-white/95 p-4 text-[#432238] shadow-[0_18px_60px_rgba(103,43,77,.18)] backdrop-blur-xl" aria-live="polite">
      <button type="button" onClick={dismiss} aria-label="Fechar aviso de instalação" className="absolute right-2 top-2 rounded-xl p-2 text-[#9a788b] transition-colors hover:bg-pink-50 hover:text-[#432238]"><X className="h-4 w-4" /></button>
      <div className="flex gap-3 pr-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-pink-500"><img src="/hungergames/icons/icon-192.png" alt="" className="h-full w-full object-cover" /></div>
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-pink-600">Hunger Games</p><p className="mt-1 text-sm font-semibold">Instale no seu celular</p><p className="mt-0.5 text-xs leading-5 text-[#816176]">Acesso rápido, mesmo quando a rotina apertar.</p></div>
      </div>
      {installHelp ? <div className="mt-3 rounded-2xl bg-[#fff3f8] p-3 text-xs leading-5 text-[#76556b]"><p className="font-semibold text-[#572b47]">Como instalar</p><p className="mt-1">{ios ? <>Toque em <Share className="mx-0.5 inline h-3.5 w-3.5 align-[-2px]" /> Compartilhar e depois em <strong>Adicionar à Tela de Início</strong>.</> : <>Abra o menu do navegador e escolha <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</>}</p></div> : <button type="button" onClick={handleInstall} disabled={installing} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl bg-pink-500 px-3 text-sm font-bold text-white transition-colors hover:bg-pink-600 disabled:opacity-60"><Download className="h-4 w-4" />{installing ? 'Abrindo instalação...' : deferredPrompt ? 'Instalar agora' : 'Como instalar'}</button>}
    </aside>
  );
}
