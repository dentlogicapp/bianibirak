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

        // UYARI - paletin dorduncu sesi (bilgi/olumlu/uyari/kritik).
        //
        // rgb(var(--x) / <alpha-value>) BICIMI ZORUNLU: opacity modifier'i
        // (bg-uyari/10, border-uyari/45) ancak boyle calisir. Duz
        // "var(--uyari)" yazsaydik modifier SESSIZCE gecersiz olur, Tailwind
        // varsayilan renge duserdi - film seridi notunda ayni tuzak yazili.
        uyari: "rgb(var(--uyari) / <alpha-value>)",

        // ---- KOPRU: amber -> uyari ----
        //
        // NEDEN VAR: uyari gostermesi gereken kod bugune kadar ham Tailwind
        // kehribarina dusuyordu ve bu ON DOSYAYA yayilmisti (amber-400/500/600,
        // toplam 20 kullanim). Ham renk sabit hex'tir; html.dark ile DEGISMEZ -
        // acik temada koyu-tema sarabina benzeyen parlak bir sari uretiyordu.
        //
        // On dosyaya birden dokunmak, calisan ekranlarda gereksiz risk demekti.
        // Bunun yerine ADIN KENDISI yeniden tanimlandi: mevcut her "amber-*"
        // sinifi artik uyari token'ini gosterir. Tek satirlik degisiklikle
        // yirmi kullanim birden temaya baglandi ve HICBIR ekran dosyasina
        // dokunulmadi.
        //
        // GECICIDIR. Yeni kodda "uyari" kullanilir; "amber-*" yalniz mevcut
        // cagrilarin yasamasi icin durur. Dosyalar zaman icinde dokunuldukca
        // (baska bir is icin acildikca) uyari'ya cevrilir, sonra bu blok silinir.
        //
        // Yalnizca KULLANIMDA OLAN uc basamak tanimlidir. Biri "amber-300"
        // yazarsa Tailwind varsayilanina duser ve renk gozle GORULUR sekilde
        // sapar - sessizce yanlis olmaktansa gurultulu yanlis olmasi yeglenir.
        amber: {
          400: "rgb(var(--uyari) / <alpha-value>)",
          500: "rgb(var(--uyari) / <alpha-value>)",
          600: "rgb(var(--uyari) / <alpha-value>)",
        },
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
