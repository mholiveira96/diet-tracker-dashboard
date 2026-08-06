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
  manifest: "/manifest.webmanifest",
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
