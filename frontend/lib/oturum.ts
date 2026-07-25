"use client";

// OTURUM DUSTU MU? - TEK YANIT, TEK YER.
//
// ===================== SORUN =====================
//
// lib/api.ts'teki istek() AG HATASINDA su cevabi doner:
//
//   { ok: false, hata: "AG_HATASI", mesaj: "Sunucuya ulasilamadi.", durum: 0 }
//
// Yani "sunucuya ULASAMADIM" ile "sunucu beni TANIMADI" ayni kabin icinde gelir:
// ikisi de ok:false. Sayfalar yalnizca !ok'a bakinca ikisini AYNI sey sanar ve
// bir sanive suren ag blibi, kullaniciyi GIRIS EKRANINA firlatir.
//
// Kullanicinin gordugu: asansorde, metroda, zayif Wi-Fi'de calisirken uygulama
// aniden oturumu kapatiyor. Oysa oturum yerinde duruyordu; yalniz paket gitmedi.
//
// Bir hatira urununde bu ozellikle agirdir: kullanici dilek okurken, kurgu
// yaparken atilir ve nerede kaldigini kaybeder.
//
// ===================== KURAL =====================
//
// Kullaniciyi giris ekranina YALNIZCA sunucu "seni tanimiyorum" dediginde
// gonderiyoruz. 401 bunun TEK isaretidir.
//
//   durum === 401  -> oturum gercekten yok. Giris ekranina gonder.
//   durum === 0    -> AG YOK. Kullanici yerinde kalir; ag gelince devam eder.
//   durum 5xx      -> sunucu arizasi. Oturumla ilgisi yok; atmak yanlis olur.
//   durum 403      -> yetki/tenant sorunu. Oturum GECERLI - baska bir ekran
//                     gosterilir ("aktif defter yok" gibi), giris DEGIL.
//
// Bu dosya tek satirlik bir fonksiyon icin var, cunku kural UC ayri sayfada
// tekrar ediyordu ve ucunde de ayni sekilde atlanmisti. Kural bir yerde yasarsa
// bir yerde duzeltilir.

export type IstekCevabi = { ok: boolean; durum?: number };

/** Sunucu "seni tanimiyorum" dedi mi? Yalnizca 401 icin true. */
export function oturumDustu(cevap: IstekCevabi): boolean {
  return !cevap.ok && cevap.durum === 401;
}

/**
 * Cevap alinamadi mi (ag yok / sunucu ulasilamaz)?
 * Bu durumda EKRAN DEGISTIRILMEZ - kullanici yerinde kalir, tekrar denenir.
 */
export function agHatasi(cevap: IstekCevabi): boolean {
  return !cevap.ok && (cevap.durum === undefined || cevap.durum === 0);
}
