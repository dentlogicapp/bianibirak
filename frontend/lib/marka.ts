// Marka kanonu - TEK dogruluk kaynagi (instruction Bolum 2).
// Bunlar marka kimligidir (tenant ayari DEGIL); degismez sabittir.
export const MARKA = {
  // Wordmark (logotype). Gorsel kullanimda kelimeler ayri kelime olarak dizilir.
  wordmark: "Bi Anı Bırak",
  wordmarkParcalar: ["Bi", "Anı", "Bırak"] as const,
  // Tagline - kilitte wordmark altinda.
  tagline: "Senden Bize Kalan",
  // Tek basina tam cumle slogan (dilbilgisel "Bir").
  slogan: "Bir Anı Bırak, Senden Bize Kalan!",
  // Metin / yasal / magaza adi.
  yasalAd: "BiAnıBırak",
  // Alan adi (link/QR - URL'de Turkce karakter dusen ASCII hali).
  alanAdi: "bianibirak.dentlogicapp.com",
} as const;
