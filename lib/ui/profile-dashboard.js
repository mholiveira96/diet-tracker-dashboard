const PROFILE_STORAGE_KEY = 'diet-tracker.active-profile-id';

function getStoredProfileId(storage) {
  const value = Number(storage?.getItem(PROFILE_STORAGE_KEY));
  return Number.isInteger(value) && value > 0 ? value : null;
}

function profileRequestUrl(path, params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

function withProfileId(payload, profileId) {
  return { ...payload, profileId };
}

module.exports = {
  PROFILE_STORAGE_KEY,
  getStoredProfileId,
  profileRequestUrl,
  withProfileId,
};
