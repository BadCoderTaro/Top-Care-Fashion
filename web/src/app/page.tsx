"use client";
import Link from "next/link";
import AppScreensCarousel from "@/components/AppScreensCarousel";
import { useAuth } from "@/components/AuthContext";
import AIFeatures from "@/components/AIFeatures";
import { useState, useEffect } from "react";

interface Testimonial {
  id: string | number;
  user: string;
  text: string;
  rating: number;
  tags: string[]; // Allow any tags, not just the predefined ones
  ts: number;
}

interface SiteStats {
  users: number;
  listings: number;
  sold: number;
  rating: number;
}

interface PricingPlan {
  type: string;
  name: string;
  description: string;
  pricing: {
    monthly: number;
    quarterly?: number;
    annual?: number;
  };
  features: string[];
  isPopular: boolean;
}

interface FeatureCard {
  title?: string;
  desc?: string;
  images?: string[] | null;
}

interface LandingContent {
  heroTitle: string;
  heroSubtitle: string;
  heroCarouselImages?: string[] | null;
  featureCards?: FeatureCard[] | null;
  aiFeatures?: {
    mixmatch?: { title?: string; desc?: string; images?: string[] | null; girlImages?: string[] | null; boyImages?: string[] | null };
    ailisting?: { title?: string; desc?: string; images?: string[] | null };
    search?: { title?: string; desc?: string; images?: string[] | null };
  };
}

interface ReleaseLinks {
  android: { version: string; url: string; releaseNotes: string | null } | null;
}

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [stats, setStats] = useState<SiteStats>({ users: 12000, listings: 38000, sold: 9400, rating: 4.8 });
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [landingContent, setLandingContent] = useState<LandingContent>({
    heroTitle: 'Discover outfits powered by AI',
    heroSubtitle: 'Mix & Match is an AI outfit recommender that builds looks from listed items. Snap, list, and get smart suggestions instantly.',
    heroCarouselImages: undefined,
    featureCards: undefined,
    aiFeatures: undefined,
  });
  const [loading, setLoading] = useState(true);
  const [releaseLinks, setReleaseLinks] = useState<ReleaseLinks>({ android: null });

  const FILTERS = [
    { key: "all", label: "All Feedback" },
    { key: "mixmatch", label: "Mix & Match" },
    { key: "ailisting", label: "AI Listing" },
    { key: "premium", label: "Premium Member" },
    { key: "buyer", label: "From Buyer" },
    { key: "seller", label: "From Seller" },
  ] as const;

  // Helper function to format tag label for display
  const formatTagLabel = (tag: string): string => {
    const tagMap: Record<string, string> = {
      mixmatch: "Mix & Match",
      ailisting: "AI Listing",
      premium: "Premium",
      buyer: "Buyer",
      seller: "Seller",
    };
    return tagMap[tag.toLowerCase()] || tag.charAt(0).toUpperCase() + tag.slice(1);
  };

  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all data in parallel
        const [testimonialsRes, statsRes, plansRes, contentRes, releasesRes] = await Promise.all([
          fetch('/api/feedback'),
          fetch('/api/site-stats'),
          fetch('/api/pricing-plans'),
          fetch('/api/landing-content'),
          fetch('/api/releases/current')
        ]);

        if (testimonialsRes.ok) {
          const testimonialsData = await testimonialsRes.json();
          setTestimonials(testimonialsData.testimonials);
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.stats);
        }

        if (plansRes.ok) {
          const plansData = await plansRes.json();
          setPricingPlans(plansData.plans);
        }

        if (contentRes.ok) {
          const contentData = await contentRes.json();
          setLandingContent(contentData);
        }

        if (releasesRes.ok) {
          const releasesData = await releasesRes.json();
          setReleaseLinks({ android: releasesData?.android ?? null });
        }
      } catch (error) {
        console.error('Error fetching homepage data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const visible = testimonials.filter((t) =>
    filter === "all"
      ? true
      : Array.isArray(t.tags) && t.tags.includes(filter)
  );
  const androidRelease = releaseLinks.android;
  return (
    <div className="flex flex-col gap-24">
      {/* Hero with carousel */}
      <section id="hero" className="grid grid-cols-1 md:grid-cols-2 items-center gap-12">
        <div>
          <h1 className="text-5xl font-semibold leading-tight tracking-tight">
            {landingContent.heroTitle}
          </h1>
          <p className="mt-4 text-lg text-black/70 max-w-prose">
            {landingContent.heroSubtitle}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {!isAuthenticated ? (
              <Link href="/register" className="inline-flex items-center rounded-md bg-[var(--brand-color)] text-white px-5 py-3 text-sm font-medium hover:opacity-90">Join for free</Link>
            ) : androidRelease ? (
              <a
                href={androidRelease.url}
                download
                className="inline-flex items-center rounded-md bg-[var(--brand-color)] text-white px-5 py-3 text-sm font-medium hover:opacity-90"
              >
                Download the app
              </a>
            ) : (
              <span className="inline-flex items-center rounded-md bg-black/10 px-5 py-3 text-sm text-black/60">Android download coming soon</span>
            )}
            <Link href="/faq" className="inline-flex items-center rounded-md border border-black/10 px-5 py-3 text-sm font-medium hover:bg-black/5">FAQ</Link>
          </div>
        </div>
        <div className="relative w-full">
          <AppScreensCarousel
            className="w-full max-w-[320px] md:max-w-[380px] mx-auto"
            images={landingContent.heroCarouselImages ?? undefined}
          />
        </div>
      </section>

      {/* AI Features with screenshots + carousels */}
      <div id="features">
        <AIFeatures cards={landingContent.featureCards} config={landingContent.aiFeatures} />
      </div>

      {/* Social proof + Stats merged */}
      <section id="community">
        <h2 className="text-3xl font-semibold tracking-tight">Loved by Trendsetters</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-sm border ${filter === f.key ? "bg-[var(--brand-color)] text-white border-[var(--brand-color)]" : "border-black/15 hover:bg-black/5"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          {visible.length === 0 ? (
            <div className="col-span-full text-center py-8 text-black/50">
              No feedback available for this filter.
            </div>
          ) : (
            visible.map((t) => {
              const tags = Array.isArray(t.tags) ? t.tags.filter(Boolean) : [];
              const from = tags.includes('buyer') ? 'from buyer' : (tags.includes('seller') ? 'from seller' : undefined);
              const userName = t.user || 'Anonymous';
              // Get user initials (first 2 characters)
              const initials = userName.slice(0, 2).toUpperCase();
              return (
               <div key={t.id} className="rounded-xl border border-black/10 p-6 shadow-sm bg-white flex flex-col">
                 <div className="flex items-center gap-2 mb-3">
                   <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                     <span className="text-xs font-semibold text-gray-600">{initials}</span>
                   </div>
                   <span className="text-sm font-medium truncate">{userName}</span>
                 </div>
                 <p className="text-sm text-black/70 mb-3 flex-grow">"{t.text}" {from && (<span className="text-black/50">— {from}</span>)}</p>
                 {tags.length > 0 && (
                   <div className="flex flex-wrap gap-1.5 mb-3">
                     {tags.map((tag, index) => (
                       <span
                         key={`${t.id}-${tag}-${index}`}
                         className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--brand-color)]/10 text-[var(--brand-color)] border border-[var(--brand-color)]/20"
                       >
                         #{formatTagLabel(tag)}
                       </span>
                     ))}
                   </div>
                 )}
                 <div className="text-[var(--brand-color)] mt-auto">{"★★★★★".slice(0, Math.round(t.rating || 0))}</div>
                </div>
            );})
          )}
        </div>

        {/* Inline Stats */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-black/10 p-6 text-center bg-white">
            <div className="text-3xl font-semibold">{stats.users >= 1000 ? `${Math.floor(stats.users/1000)}k+` : stats.users}</div>
            <div className="text-xs text-black/60">Users</div>
          </div>
          <div className="rounded-xl border border-black/10 p-6 text-center bg-white">
            <div className="text-3xl font-semibold">{stats.listings >= 1000 ? `${Math.floor(stats.listings/1000)}k+` : stats.listings}</div>
            <div className="text-xs text-black/60">Items listed</div>
          </div>
          <div className="rounded-xl border border-black/10 p-6 text-center bg-white">
            <div className="text-3xl font-semibold">{stats.sold >= 1000 ? `${(stats.sold/1000).toFixed(1)}k` : stats.sold}</div>
            <div className="text-xs text-black/60">Items sold</div>
          </div>
          <div className="rounded-xl border border-black/10 p-6 text-center bg-white">
            <div className="text-3xl font-semibold">{stats.rating}★</div>
            <div className="text-xs text-black/60">Avg. rating</div>
          </div>
        </div>
      </section>


      {/* Pricing */}
      <section id="pricing">
        <h2 className="text-3xl font-semibold tracking-tight">Plans & Pricing</h2>
        {loading ? (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="animate-pulse rounded-2xl border border-black/10 p-6 bg-white shadow-sm">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-1"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-3 bg-gray-200 rounded w-full"></div>
                ))}
              </div>
            </div>
            <div className="animate-pulse rounded-2xl border border-black/10 p-6 bg-white shadow-sm">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-1"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-3 bg-gray-200 rounded w-full"></div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {pricingPlans.map((plan) => (
              <div 
                key={plan.type} 
                className={`relative rounded-2xl border border-black/10 p-6 shadow-sm ${
                  plan.isPopular ? 'bg-gradient-to-b from-white to-[#fff5f4]' : 'bg-white'
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3 right-4 text-[10px] px-2 py-1 rounded-full bg-[var(--brand-color)] text-white shadow">POPULAR</div>
                )}
                <div className="text-xs font-medium tracking-wide text-black/60">
                  {plan.type === 'FREE' ? 'Starter' : 'Pro'}
                </div>
                <h3 className="mt-1 text-xl font-semibold">{plan.name}</h3>
                <p className="mt-1 text-sm">{plan.description}</p>
                <ul className="mt-4 text-sm space-y-2 text-black/80">
                  {plan.features.map((feature, index) => (
                    <li key={index}>• {feature}</li>
                  ))}
                </ul>
                {(() => {
                  const isFreePlan = plan.type?.toLowerCase() === "free";

                  if (!isAuthenticated) {
                    return (
                      <Link
                        href="/register"
                        className={`mt-6 inline-flex items-center rounded-md px-4 py-2 text-sm hover:opacity-90 ${
                          plan.isPopular
                            ? 'bg-[var(--brand-color)] text-white'
                            : 'text-[var(--brand-color)] hover:underline'
                        }`}
                      >
                        {isFreePlan ? 'Get started' : 'Upgrade'}
                      </Link>
                    );
                  }

                  if (isFreePlan) {
                    return <span className="mt-6 inline-flex items-center rounded-md px-4 py-2 text-sm text-black/60 bg-black/10">Included in your plan</span>;
                  }

                  if (androidRelease) {
                    return (
                      <a
                        href={androidRelease.url}
                        download
                        className={`mt-6 inline-flex items-center rounded-md px-4 py-2 text-sm hover:opacity-90 ${
                          plan.isPopular
                            ? 'bg-[var(--brand-color)] text-white'
                            : 'text-[var(--brand-color)] hover:underline'
                        }`}
                      >
                        Download the app
                      </a>
                    );
                  }

                  return <span className="mt-6 inline-flex items-center rounded-md px-4 py-2 text-sm text-black/60 bg-black/10">Android download coming soon</span>;
                })()}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CTA / Download */}
      <section id="download" className="text-center">
        <h2 className="text-2xl font-semibold">Ready to try?</h2>
        <p className="mt-2 text-black/70">Create your account and list your first item in minutes.</p>
        <div className="mt-6">
          {!isAuthenticated ? (
            <Link href="/register" className="inline-flex items-center rounded-md bg-[var(--brand-color)] text-white px-6 py-3 text-sm font-medium hover:opacity-90">Sign up now</Link>
          ) : androidRelease ? (
            <a
              href={androidRelease.url}
              download
              className="inline-flex items-center rounded-md bg-[var(--brand-color)] text-white px-6 py-3 text-sm font-medium hover:opacity-90"
            >
                Download the app
            </a>
          ) : (
            <span className="inline-flex items-center rounded-md bg-black/10 px-6 py-3 text-sm text-black/60">Android download coming soon</span>
          )}
        </div>
        <div className="mt-6">
          <Link href="/faq" className="text-sm text-[var(--brand-color)] hover:underline">FAQ</Link>
        </div>
      </section>
    </div>
  );
}
