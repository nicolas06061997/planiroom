import "@fontsource-variable/inter";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { EnregistrementSW } from "@/components/EnregistrementSW";
import { BASE } from "@/config";
import { StoreProvider } from "@/lib/store";

export const metadata: Metadata = {
  title: "Planiroom – Hôtel du Casino",
  description: "Planning ménage de l'Hôtel du Casino de Dinant",
  manifest: `${BASE}/manifest.webmanifest`,
  appleWebApp: { capable: true, title: "Planiroom", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: `${BASE}/icon.svg`, type: "image/svg+xml" }, { url: `${BASE}/icon-192.png`, sizes: "192x192" }],
    apple: `${BASE}/apple-touch-icon.png`,
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
      <body className="font-sans">
        <StoreProvider>{children}</StoreProvider>
        <EnregistrementSW />
      </body>
    </html>
  );
}
