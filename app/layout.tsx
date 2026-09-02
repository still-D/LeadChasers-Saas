import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "LeadChasers OS", template: "%s · LeadChasers OS" },
  description: "Le centre de commande interne de LeadChasers Media Coop.",
  applicationName: "LeadChasers OS",
  icons: {
    icon: "/brand/leadchasers-logo-transparent.png",
    apple: "/brand/leadchasers-logo-transparent.png",
  },
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#081711",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fr"><body>{children}</body></html>;
}
