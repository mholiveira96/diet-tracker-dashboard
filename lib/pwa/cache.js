function shouldCacheRequest(method, url, origin) {
  if (method !== 'GET') return false;

  const parsed = new URL(url);
  const requestOrigin = origin || parsed.origin;
  if (parsed.origin !== requestOrigin) return false;
  if (parsed.pathname.startsWith('/api/')) return false;

  return true;
}

module.exports = {
  shouldCacheRequest,
};
