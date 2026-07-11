import type { Metadata, Viewport } from "next";
// Self-host fontlar (fontsource) - Google'a runtime cagri YOK.
import "@fontsource-variable/fraunces";
import "@fontsource-variable/inter";
import "./globals.css";
import { MARKA } from "@/lib/marka";
import { PWARegister } from "@/components/site/PWARegister";
import { Toaster } from "sonner";
import { TEMA_INLINE_SCRIPT } from "@/lib/tema";

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
  appleWebApp: { capable: true, title: MARKA.yasalAd, statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
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
      <head>
        {/* Tema flash-onleme: CSS yuklenmeden html.dark ayarlanir */}
        <script dangerouslySetInnerHTML={{ __html: TEMA_INLINE_SCRIPT }} />
      </head>
      <body>
        {children}
        <PWARegister />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "var(--yuzey)",
              color: "var(--murekkep)",
              border: "1px solid var(--ayrac)",
              fontFamily: "var(--font-govde), Inter, sans-serif",
              fontSize: "0.875rem",
              lineHeight: "1.5",
              borderRadius: "1rem",
              boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
            },
          }}
          duration={5000}
          closeButton
        />
      </body>
    </html>
  );
}
