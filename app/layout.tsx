import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Hunger Games",
  description: "Registro de dieta e treino com chat, analytics e perfil.",
  applicationName: "Hunger Games",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Hunger Games",
  },
  manifest: "/hungergames/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/hungergames/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/hungergames/icons/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/hungergames/icons/icon-180.png", type: "image/png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#e75491",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
