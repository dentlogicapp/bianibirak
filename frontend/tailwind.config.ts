import type { Config } from "tailwindcss";

// BiAniBirak tasarim token'lari.
// Yon: Turk hatira defteri (parsomen + sarap + yaldiz) - sicak, sade, premium.
// AI-varsayilani "krem + terracotta" kumesinden bilincli kacinildi:
// aksan terracotta DEGIL, koyu SARAP; imza aksani YALDIZ (miras/heirloom).
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: "class", // manuel toggle (UserMenu) - flash-onleme inline script ile
  theme: {
    extend: {
      colors: {
        // CSS degiskenine bagli -> html.dark'ta deger degisir, class'lar aynen kalir.
        parsomen: "var(--parsomen)", // zemin (parsomen/kagit)
        yuzey: "var(--yuzey)", // kart yuzeyi
        yuzeyKoyu: "var(--yuzey-koyu)", // ikincil yuzey
        murekkep: "var(--murekkep)", // ana metin
        ikincil: "var(--ikincil)", // ikincil metin
        sarap: "var(--sarap)", // birincil aksan (koyu sarap)
        sarapKoyu: "var(--sarap-koyu)", // hover/pressed
        yaldiz: "var(--yaldiz)", // imza aksani (yaldiz/altin)
        yaldizAcik: "var(--yaldiz-acik)", // yaldiz vurgu
        ayrac: "var(--ayrac)", // saclanmis ince cizgi
      },
      fontFamily: {
        // self-host (fontsource) - Google'a runtime cagri YOK (KVKK dostu)
        display: ['"Fraunces Variable"', "Georgia", "serif"],
        govde: ['"Inter Variable"', "system-ui", "sans-serif"],
      },
      maxWidth: {
        icerik: "72rem",
      },
      letterSpacing: {
        etiket: "0.18em",
      },
      keyframes: {
        yumusakGiris: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        yumusakGiris: "yumusakGiris 0.7s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
