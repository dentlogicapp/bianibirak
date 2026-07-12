"use client";

// DEFTER KARTI - dilegin KAGITTAKI hali.
//
// TEK DOGRULUK KAYNAGI: bu bilesenin olculeri, BaskiServisi.cs'teki PDF dizgisiyle
// BIREBIR ayni. Davetli onizlemede ne goruyorsa, kagitta o basilir. Iki ayri yerde
// iki ayri "yaklasik" dizgi tutmak, kacinilmaz olarak birbirinden ayrisir ve
// onizleme YALAN SOYLEMEYE baslar - kabul edilemez.
//
// PDF karsiliklari (BaskiServisi.cs):
//   YonBul   : oran >= 1.15 yatay | <= 0.87 dikey | arasi kare
//   Azami    : dikey 198x232pt | kare 216x216pt | yatay 268x182pt
//   Cerceve  : yaldiz hat + beyaz pasepartu (mat)
//   Kart     : fotograf varsa KartYuzey + KartHat cerceve; yoksa cercevesiz akis
//
// pt -> px: A5 icerik genisligi ~313pt, ekranda ~320px kullaniyoruz -> 1pt ≈ 1.02px.
// Oranlar korundugu icin gorsel esitlik tam.

const PT = 1.02;

type Yon = "yatay" | "kare" | "dikey";

function yonBul(g: number, y: number): Yon {
  if (g <= 0 || y <= 0) return "yatay";
  const oran = g / y;
  if (oran >= 1.15) return "yatay";
  if (oran <= 0.87) return "dikey";
  return "kare";
}

// PDF'teki Olcule() ile ayni: orana SADIK, hangi tavana once carparsa ona uyar.
function olcule(
  g: number,
  y: number,
  azamiG: number,
  azamiY: number
): { g: number; y: number } {
  const oran = g > 0 && y > 0 ? g / y : 3 / 2;

  let gg = azamiG;
  let yy = gg / oran;

  if (yy > azamiY) {
    yy = azamiY;
    gg = yy * oran;
  }
  return { g: gg, y: yy };
}

export function fotoOlcusu(genislik: number, yukseklik: number) {
  const yon = yonBul(genislik, yukseklik);

  // PDF ile BIREBIR ayni tavanlar (BaskiServisi.cs:400-402)
  const [azamiG, azamiY] =
    yon === "dikey" ? [198, 232] : yon === "kare" ? [216, 216] : [268, 182];

  const { g, y } = olcule(genislik, yukseklik, azamiG, azamiY);
  return { genislik: g * PT, yukseklik: y * PT };
}

type Props = {
  ad: string;
  iliski: string;
  mesaj: string;
  fotoUrl: string | null;
  fotoGenislik: number;
  fotoYukseklik: number;
  tarih: string | null;
  tema?: string;
};

export function DefterKarti({
  ad,
  iliski,
  mesaj,
  fotoUrl,
  fotoGenislik,
  fotoYukseklik,
  tarih,
  tema = "klasik",
}: Props) {
  const fotoVar = Boolean(fotoUrl);
  const italik = tema === "zarif";

  // Fotograf kutusu: orana SADIK. Kutu orani = fotograf orani oldugu icin
  // icinde beyaz bosluk KALMAZ, kirpma da olmaz.
  const olcu = fotoVar ? fotoOlcusu(fotoGenislik, fotoYukseklik) : null;

  const MAT = 3.5 * PT; // pasepartu (PDF: mat: 3.5f)

  return (
    <div
      className={
        fotoVar
          ? "border border-[#e8dcc4] bg-[#fffdf8] px-[13px] py-[13px] text-center"
          : "py-1 text-center"
      }
    >
      {fotoVar && olcu && (
        <div
          className="mx-auto mb-[13px] border border-[#a8823c] bg-white"
          style={{
            width: olcu.genislik + MAT * 2,
            height: olcu.yukseklik + MAT * 2,
            padding: MAT,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fotoUrl!}
            alt=""
            className="h-full w-full object-contain"
            draggable={false}
          />
        </div>
      )}

      <p
        className={`font-govde text-[0.84rem] leading-[1.72] text-[#3a2f28] ${
          italik ? "italic" : ""
        }`}
      >
        {mesaj}
      </p>

      {/* Imza ayraci - PDF'teki Ayrac() ile ayni (klasik: yaldiz hat + elmas) */}
      <div className="mx-auto my-[10px] flex w-fit items-center gap-1.5" aria-hidden>
        <span className="h-px w-[15px] bg-[#a8823c]" />
        <span className="h-[3px] w-[3px] rotate-45 bg-[#a8823c]" />
        <span className="h-px w-[15px] bg-[#a8823c]" />
      </div>

      <p className="font-display text-[0.82rem] text-[#6e2438]">{ad}</p>

      {iliski && (
        <p className="mt-[3px] font-govde text-[0.62rem] text-[#6c5f50]">{iliski}</p>
      )}

      {tarih && (
        <p className="mt-[3px] font-govde text-[0.55rem] text-[#c9a96a]">{tarih}</p>
      )}
    </div>
  );
}
