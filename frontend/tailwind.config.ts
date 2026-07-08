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
  theme: {
    extend: {
      colors: {
        parsomen: "#F4EBDA", // zemin (parsomen/kagit)
        yuzey: "#EFE7D5", // kart yuzeyi
        yuzeyKoyu: "#E4D8BF", // ikincil yuzey
        murekkep: "#211A17", // ana metin (sicak siyah)
        ikincil: "#6C5F50", // ikincil metin
        sarap: "#6E2438", // birincil aksan (koyu sarap)
        sarapKoyu: "#571B2C", // hover/pressed
        yaldiz: "#A8823C", // imza aksani (yaldiz/altin)
        yaldizAcik: "#C4A25E", // yaldiz vurgu
        ayrac: "#D8C7A9", // saclanmis ince cizgi
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
