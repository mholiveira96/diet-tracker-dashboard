export default function manifest() {
  return {
    name: 'Hunger Games',
    short_name: 'Hunger Games',
    description: 'Chat-first diet and workout tracker.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fff8fc',
    theme_color: '#e75491',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
    ],
  };
}
