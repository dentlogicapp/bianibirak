import { Ustbar } from "@/components/site/Ustbar";
import { Altbilgi } from "@/components/site/Altbilgi";
import { Hero } from "@/components/landing/Hero";
import { Imza } from "@/components/landing/Imza";
import { Birlesim } from "@/components/landing/Birlesim";
import { Kapanis } from "@/components/landing/Kapanis";

export default function AnaSayfa() {
  return (
    <>
      <Ustbar />
      <main>
        <Hero />
        <Imza />
        <Birlesim />
        <Kapanis />
      </main>
      <Altbilgi />
    </>
  );
}
