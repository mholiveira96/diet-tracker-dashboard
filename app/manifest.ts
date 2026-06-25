export default function manifest() {
  return {
    name: 'Diet Tracker PWA',
    short_name: 'DietTracker',
    description: 'Chat-first diet and workout tracker.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b141a',
    theme_color: '#111b21',
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
