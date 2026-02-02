"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

export default function AppScreensCarousel({
  intervalMs = 4000,
  className = "",
  images,
}: {
  intervalMs?: number;
  className?: string;
  images?: string[];
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const slides = useMemo(() => {
    const list = images && images.length > 0
      ? images
      : [];
    return list.map((src) => {
      const safeSrc = src.replace(/ /g, "%20");
      const name = safeSrc.split("/").pop() || safeSrc;
      const alt = name.replace(/%20/g, " ").replace(/\.png$/i, "");
      return { src: safeSrc, alt };
    });
  }, [images]);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, intervalMs);
    return () => clearInterval(t);
  }, [slides.length, intervalMs, paused]);

  const go = (delta: number) => setIndex((i) => (i + delta + slides.length) % slides.length);

  return (
    <div
      className={`relative aspect-[1608/3496] ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Screen frame */}
      <div className="absolute inset-0 rounded-[24px] border border-black/10 shadow-xl overflow-hidden bg-white">
        {slides.map((s, i) => (
          <Image
            key={s.src}
            src={s.src}
            alt={s.alt}
            fill
            priority={i === index}
            className={`object-contain bg-white transition-opacity duration-500 ${i === index ? "opacity-100" : "opacity-0"}`}
          />
        ))}
      </div>

      {/* Controls */}
      <button
        type="button"
        aria-label="Previous screenshot"
        onClick={() => go(-1)}
        className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 hover:bg-white text-black shadow border border-black/10 grid place-items-center"
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Next screenshot"
        onClick={() => go(1)}
        className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 hover:bg-white text-black shadow border border-black/10 grid place-items-center"
      >
        ›
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-[var(--brand-color)]" : "w-2.5 bg-black/20"}`}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setIndex(i)}
          />)
        )}
      </div>
    </div>
  );
}
