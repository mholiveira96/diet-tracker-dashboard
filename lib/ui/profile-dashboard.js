const PROFILE_STORAGE_KEY = 'diet-tracker.active-profile-id';
const PUBLIC_APP_PREFIX = '/hungergames';

function getStoredProfileId(storage) {
  const value = Number(storage?.getItem(PROFILE_STORAGE_KEY));
  return Number.isInteger(value) && value > 0 ? value : null;
}

function getAppPathPrefix(locationLike) {
  const pathname = locationLike?.pathname || (typeof window !== 'undefined' ? window.location?.pathname : '');
  return pathname === PUBLIC_APP_PREFIX || pathname.startsWith(`${PUBLIC_APP_PREFIX}/`) ? PUBLIC_APP_PREFIX : '';
}

function profileRequestUrl(path, params = {}, locationLike) {
  const prefix = getAppPathPrefix(locationLike);
  const scopedPath = prefix && !path.startsWith(`${prefix}/`) && path !== prefix ? `${prefix}${path}` : path;
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `${scopedPath}?${query}` : scopedPath;
}

function withProfileId(payload, profileId) {
  return { ...payload, profileId };
}

module.exports = {
  PROFILE_STORAGE_KEY,
  PUBLIC_APP_PREFIX,
  getStoredProfileId,
  getAppPathPrefix,
  profileRequestUrl,
  withProfileId,
};
