"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

function PhoneCarousel({ images, className = "", altPrefix = "Feature" }: { images: string[]; className?: string; altPrefix?: string }) {
  const [i, setI] = useState(0);
  const slides = useMemo(() => images.map((s) => s.replace(/ /g, "%20")), [images]);
  useEffect(() => {
    if (slides.length === 0) return;
    const t = setInterval(() => setI((v) => (v + 1) % slides.length), 3000);
    return () => clearInterval(t);
  }, [slides.length]);
  if (slides.length === 0) {
    return (
      <div className={`relative aspect-[1608/3496] w-full max-w-[320px] md:max-w-[380px] mx-auto ${className}`}>
        <div className="absolute inset-0 rounded-[24px] border border-dashed border-black/10 bg-black/5 flex items-center justify-center text-sm text-black/40">
          Upload screenshots to preview
        </div>
      </div>
    );
  }
  return (
    <div className={`relative aspect-[1608/3496] w-full max-w-[320px] md:max-w-[380px] mx-auto ${className}`}>
      <div className="absolute inset-0 rounded-[24px] border border-black/10 shadow-xl overflow-hidden bg-white">
        {slides.map((src, idx) => (
          <Image key={src} src={src} alt={`${altPrefix} ${idx + 1}`} fill priority={idx === i} className={`object-contain bg-white transition-opacity duration-500 ${idx === i ? "opacity-100" : "opacity-0"}`} />
        ))}
      </div>
      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5">
        {slides.map((_, idx) => (
          <span key={idx} className={`h-1.5 rounded-full ${idx === i ? "w-5 bg-[var(--brand-color)]" : "w-2.5 bg-black/20"}`} />
        ))}
      </div>
    </div>
  );
}

type FeatureCard = {
  title?: string;
  desc?: string;
  images?: string[] | null;
};

type AIFeaturesConfig = {
  mixmatch?: { title?: string; desc?: string; images?: string[] | null; girlImages?: string[] | null; boyImages?: string[] | null };
  ailisting?: { title?: string; desc?: string; images?: string[] | null };
  search?: { title?: string; desc?: string; images?: string[] | null };
};

export default function AIFeatures({ cards, config }: { cards?: FeatureCard[] | null; config?: AIFeaturesConfig }) {
  const defaultMixGirl: string[] = [];
  const defaultListing: string[] = [];
  const defaultSearch: string[] = [];

  // Use unified images; fallback to legacy girlImages if needed
  const mixImages = (config?.mixmatch?.images && config.mixmatch.images.length > 0)
    ? config.mixmatch.images
    : ((config?.mixmatch?.girlImages && config.mixmatch.girlImages.length > 0) ? config.mixmatch.girlImages : defaultMixGirl);
  const listing = (config?.ailisting?.images && config.ailisting.images.length > 0) ? config.ailisting.images : defaultListing;
  const search = (config?.search?.images && config.search.images.length > 0) ? config.search.images : defaultSearch;

  const fallbackCards: Array<{ title: string; desc: string; images: string[] }> = [
    {
      title: config?.mixmatch?.title || "Mix & Match",
      desc: config?.mixmatch?.desc || "AI outfit recommendations from your listed items.",
      images: mixImages,
    },
    {
      title: config?.ailisting?.title || "AI Listing",
      desc: config?.ailisting?.desc || "Auto-generate titles, tags and descriptions from photos.",
      images: listing,
    },
    {
      title: config?.search?.title || "Search",
      desc: config?.search?.desc || "Natural language and image-based search to find pieces fast.",
      images: search,
    },
  ];

  const resolvedCards =
    cards && cards.length > 0
      ? cards.map((card, idx) => ({
          title: card.title || `Feature ${idx + 1}`,
          desc: card.desc || "",
          images: (card.images && card.images.length > 0 ? card.images : []),
        }))
      : fallbackCards;

  const marqueeCards = resolvedCards.length > 0 ? [...resolvedCards, ...resolvedCards] : resolvedCards;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [paused, setPaused] = useState(false);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const userInteractionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    const node = scrollRef.current;
    let frame: number;
    const halfWidth = node.scrollWidth / 2;
    if (halfWidth === 0) return;

    const step = () => {
      if (node && !paused && !isUserInteracting) {
        node.scrollLeft += 0.75;
        if (node.scrollLeft >= halfWidth) {
          node.scrollLeft = 0;
        }
      }
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [paused, isUserInteracting, marqueeCards.length]);

  // Handle user interaction detection
  const handleUserInteractionStart = () => {
    setIsUserInteracting(true);
    if (userInteractionTimeoutRef.current) {
      clearTimeout(userInteractionTimeoutRef.current);
    }
  };

  const handleUserInteractionEnd = () => {
    if (userInteractionTimeoutRef.current) {
      clearTimeout(userInteractionTimeoutRef.current);
    }
    userInteractionTimeoutRef.current = setTimeout(() => {
      setIsUserInteracting(false);
    }, 1500); // Resume auto-scroll 1.5 seconds after user stops interacting
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (userInteractionTimeoutRef.current) {
        clearTimeout(userInteractionTimeoutRef.current);
      }
    };
  }, []);

  return (
    <section>
      <h2 className="text-3xl font-semibold tracking-tight">Features</h2>
      <div className="mt-8">
        <div
          ref={scrollRef}
          className="relative overflow-x-auto overflow-y-hidden w-screen left-1/2 -ml-[50vw] rounded-none md:rounded-[32px] scrollbar-hide"
          style={{ WebkitOverflowScrolling: 'touch' }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={handleUserInteractionStart}
          onTouchEnd={handleUserInteractionEnd}
          onMouseDown={handleUserInteractionStart}
          onMouseUp={handleUserInteractionEnd}
        >
          {/* Full-bleed track (no side padding to remove gaps) */}
          <div className="flex items-stretch gap-6">
            {marqueeCards.map((c, idx) => (
              <div key={`${c.title}-${idx}`} className="flex-shrink-0 w-[320px] sm:w-[360px] md:w-[380px]">
                <div className="rounded-3xl border border-black/10 p-6 md:p-8 bg-white flex flex-col h-full shadow-sm">
                  <div className="min-h-[88px]">
                    <h3 className="font-medium text-2xl">{c.title}</h3>
                    <p className="text-base text-black/70 mt-2">{c.desc}</p>
                  </div>
                  <div className="relative mt-6 mt-auto">
                    <PhoneCarousel images={c.images ?? []} className="pt-2" altPrefix={c.title} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
