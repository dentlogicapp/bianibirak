"use client";

import { useEffect, useRef, useState } from "react";

// Bolum/oge ekrana girince yumusak fade + yukari kayma. Stagger icin gecikme(ms).
export function Reveal({
  children,
  gecikme = 0,
  className = "",
}: {
  children: React.ReactNode;
  gecikme?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [gorundu, setGorundu] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setGorundu(true);
      return;
    }
    const io = new IntersectionObserver(
      (girisler) => {
        girisler.forEach((g) => {
          if (g.isIntersecting) {
            setGorundu(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${gorundu ? "gorundu" : ""} ${className}`}
      style={{ transitionDelay: `${gecikme}ms` }}
    >
      {children}
    </div>
  );
}
