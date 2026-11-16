import "@fontsource-variable/inter";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { EnregistrementSW } from "@/components/EnregistrementSW";
import { StoreProvider } from "@/lib/store";

export const metadata: Metadata = {
  title: "Planiroom – Hôtel du Casino",
  description: "Planning ménage de l'Hôtel du Casino de Dinant",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Planiroom", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#F5F6F8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <StoreProvider>{children}</StoreProvider>
        <EnregistrementSW />
      </body>
    </html>
  );
}
