"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type DenetimKaydi } from "@/lib/api";
import { AppShell } from "@/components/site/AppShell";

// Denetim gunlugu: aktif etkinligin son islemleri (seffaflik; append-only audit).
export default function DenetimSayfasi() {
  const router = useRouter();
  const [kayitlar, setKayitlar] = useState<DenetimKaydi[]>([]);
  const [durum, setDurum] = useState<"yukleniyor" | "hazir" | "yok">("yukleniyor");

  useEffect(() => {
    api.denetimGunlugu().then((c) => {
      if (c.ok) {
        setKayitlar(c.veri);
        setDurum("hazir");
      } else if (c.durum === 401) {
        router.replace("/giris");
      } else {
        setDurum("yok");
      }
    });
  }, [router]);

  return (
    <AppShell>
      <div className="rounded-3xl border border-ayrac bg-yuzey p-6 sm:p-8">
        <p className="font-govde text-xs uppercase tracking-etiket text-yaldiz">Etkinlik</p>
        <h1 className="mt-2 font-display text-2xl text-murekkep sm:text-3xl">Denetim Günlüğü</h1>
        <p className="mt-2 font-govde text-sm leading-relaxed text-ikincil">
          Etkinliğinizde gerçekleşen işlemlerin şeffaf kaydı. En yeni üstte.
        </p>
      </div>

      <div className="mt-6">
        {durum === "yukleniyor" ? (
          <p className="font-govde text-sm text-ikincil">Yükleniyor...</p>
        ) : durum === "yok" ? (
          <p className="rounded-3xl border border-ayrac bg-yuzey p-8 text-center font-govde text-sm text-ikincil">
            Aktif bir etkinlik seçili değil.
          </p>
        ) : kayitlar.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-ayrac bg-yuzey p-8 text-center font-govde text-sm text-ikincil">
            Henüz kayıt yok.
          </p>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-ayrac bg-yuzey">
            <ul className="divide-y divide-ayrac">
              {kayitlar.map((k) => (
                <li key={k.id} className="flex items-start gap-3 px-5 py-4">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sarap" />
                  <div className="min-w-0 flex-1">
                    <p className="font-govde text-sm font-medium text-murekkep">
                      {eylemEtiketi(k.eylem)}
                    </p>
                    <p className="mt-0.5 font-govde text-xs text-ikincil">
                      {tarihSaatMetni(k.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function eylemEtiketi(eylem: string): string {
  const harita: Record<string, string> = {
    KATKI_BIRAKILDI: "Bir davetli dilek bıraktı",
    KATKI_ONAYLANDI: "Bir dilek onaylandı",
    ODEME_BASLATILDI: "Ödeme başlatıldı",
    ODEME_BILDIRILDI: "Havale bildirimi yapıldı",
    ODEME_ONAYLANDI: "Ödemeniz onaylandı",
    KATKI_REDDEDILDI: "Bir dilek reddedildi",
    ETKINLIK_OLUSTURULDU: "Etkinlik oluşturuldu",
    ETKINLIK_GUNCELLENDI: "Etkinlik güncellendi",
    AYAR_GUNCELLENDI: "Ayarlar güncellendi",
    PUSH_GONDERILDI: "Bildirim gönderildi",
    GIRIS: "Giriş yapıldı",
    KAYIT: "Hesap oluşturuldu",
  };
  return harita[eylem] ?? eylem;
}

function tarihSaatMetni(iso: string): string {
  const t = new Date(iso);
  if (isNaN(t.getTime())) return iso;
  return t.toLocaleString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
