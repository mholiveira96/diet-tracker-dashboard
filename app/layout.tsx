import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Diet Tracker",
  description: "Registro de dieta e treino com chat, analytics e perfil.",
  applicationName: "Diet Tracker",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Diet Tracker",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#111b21",
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
