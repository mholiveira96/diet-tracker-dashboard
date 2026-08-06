export default function manifest() {
  return {
    name: 'Hunger Games',
    short_name: 'Hunger Games',
    description: 'Chat-first diet and workout tracker.',
    id: '/hungergames/',
    start_url: '/hungergames/',
    scope: '/hungergames/',
    display: 'standalone',
    background_color: '#fff8fc',
    theme_color: '#e75491',
    orientation: 'portrait',
    icons: [
      { src: '/hungergames/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/hungergames/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/hungergames/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
