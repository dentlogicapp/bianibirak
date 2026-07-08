import type { Metadata, Viewport } from "next";
// Self-host fontlar (fontsource) - Google'a runtime cagri YOK.
import "@fontsource-variable/fraunces";
import "@fontsource-variable/inter";
import "./globals.css";
import { MARKA } from "@/lib/marka";

export const metadata: Metadata = {
  title: {
    default: `${MARKA.yasalAd} - ${MARKA.tagline}`,
    template: `%s - ${MARKA.yasalAd}`,
  },
  description:
    "Sevdiklerinin sözlerini, çocuklarına kalan güzel bir mirasa dönüştür. " +
    "Toplayıcı değil, kürasyon stüdyosu.",
  manifest: "/manifest.webmanifest",
  applicationName: MARKA.yasalAd,
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#6E2438",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
