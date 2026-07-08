import Link from "next/link";

type Ton = "birincil" | "ikincil";

const tonlar: Record<Ton, string> = {
  birincil:
    "bg-sarap text-parsomen hover:bg-sarapKoyu shadow-sm",
  ikincil:
    "bg-transparent text-murekkep ring-1 ring-ayrac hover:ring-sarap hover:text-sarap",
};

export function Buton({
  href,
  ton = "birincil",
  children,
}: {
  href: string;
  ton?: Ton;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-full px-7 py-3 font-govde text-sm font-medium transition-colors ${tonlar[ton]}`}
    >
      {children}
    </Link>
  );
}
