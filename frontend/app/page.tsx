import { Ustbar } from "@/components/site/Ustbar";
import { Altbilgi } from "@/components/site/Altbilgi";
import { Hero } from "@/components/landing/Hero";
import { Imza } from "@/components/landing/Imza";
import { DegerOnermesi } from "@/components/landing/DegerOnermesi";
import { Kapanis } from "@/components/landing/Kapanis";

export default function AnaSayfa() {
  return (
    <>
      <Ustbar />
      <main>
        <Hero />
        <Imza />
        <DegerOnermesi />
        <Kapanis />
      </main>
      <Altbilgi />
    </>
  );
}
