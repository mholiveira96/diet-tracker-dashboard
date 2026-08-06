const DISMISSAL_KEY = 'hunger-games-pwa-install-dismissed-at';
const DISMISSAL_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

function isStandaloneWindow(windowLike) {
  return Boolean(
    windowLike?.matchMedia?.('(display-mode: standalone)')?.matches
      || windowLike?.navigator?.standalone === true
  );
}

function isIosDevice(navigatorLike) {
  const userAgent = String(navigatorLike?.userAgent || '').toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent)
    || (navigatorLike?.platform === 'MacIntel' && Number(navigatorLike?.maxTouchPoints || 0) > 1);
}

function isMobileViewport(windowLike) {
  return Boolean(windowLike?.matchMedia?.('(max-width: 767px)')?.matches);
}

function hasRecentDismissal(value, now = Date.now()) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 && now - timestamp < DISMISSAL_COOLDOWN_MS;
}

function canShowInstallToast({ standalone, mobile, dismissed, hasDeferredPrompt, ios }) {
  return !standalone && !dismissed && (hasDeferredPrompt || (mobile && ios));
}

module.exports = {
  DISMISSAL_KEY,
  DISMISSAL_COOLDOWN_MS,
  isStandaloneWindow,
  isIosDevice,
  isMobileViewport,
  hasRecentDismissal,
  canShowInstallToast,
};
