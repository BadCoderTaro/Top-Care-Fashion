"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import FeatureCardManager, { FeatureCard } from "@/components/admin/FeatureCardManager";
import AssetLibraryManager from "../../../components/admin/AssetLibraryManager";
import { createSupabaseBrowser } from "@/lib/supabase.browser";

interface SiteStats {
  users: number;
  listings: number;
  sold: number;
  rating: number;
}

interface LandingContent {
  heroTitle: string;
  heroSubtitle: string;
  heroCarouselImages?: string[];
  featureCards?: FeatureCard[];
  aiFeatures?: {
    mixmatch?: { title?: string; desc?: string; images?: string[]; girlImages?: string[]; boyImages?: string[] };
    ailisting?: { title?: string; desc?: string; images?: string[] };
    search?: { title?: string; desc?: string; images?: string[] };
  };
}

interface FeedbackItem {
  id: number;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  message: string;
  rating?: number | null;
  tags: string[];
  featured: boolean;
  createdAt: string;
  associatedUserName?: string | null;
}

interface NewFeedbackForm {
  userName: string;
  userEmail: string;
  message: string;
  rating: number | null;
  tags: string[];
  featured: boolean;
}

interface PricingPlan {
  type: string;
  name: string;
  description: string;
  listingLimit: number | null;
  promotionPrice: string;
  promotionDiscount: string | null;
  commissionRate: string;
  mixMatchLimit: number | null;
  freePromotionCredits: number;
  sellerBadge: string | null;
  features: string[];
  isPopular: boolean;
}

interface Release {
  id: number;
  version: string;
  platform: string;
  file_url: string;
  file_name: string;
  file_size: number;
  release_notes: string | null;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

export default function ContentManagementPage() {
  const [stats, setStats] = useState<SiteStats>({ users: 0, listings: 0, sold: 0, rating: 0 });
  const [content, setContent] = useState<LandingContent>({ heroTitle: "", heroSubtitle: "", heroCarouselImages: [], featureCards: [], aiFeatures: {} });
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [newFeedback, setNewFeedback] = useState<NewFeedbackForm>({ userName: "", userEmail: "", message: "", rating: 5, tags: [], featured: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingFeedbackId, setUpdatingFeedbackId] = useState<number | null>(null);
  const [deletingFeedbackId, setDeletingFeedbackId] = useState<number | null>(null);
  const [feedbackQuery, setFeedbackQuery] = useState("");
  const [releases, setReleases] = useState<Release[]>([]);
  const [uploadingRelease, setUploadingRelease] = useState(false);
  const [deletingReleaseId, setDeletingReleaseId] = useState<number | null>(null);
  const [newTag, setNewTag] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const [deletingTag, setDeletingTag] = useState<string | null>(null);
  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowser();
    } catch (error) {
      console.error("Failed to initialize Supabase browser client:", error);
      return null;
    }
  }, []);
  const filteredFeedbacks = useMemo(() => {
    const term = feedbackQuery.trim().toLowerCase();
    if (!term) return feedbacks;
    return feedbacks.filter((feedback) => {
      const fields = [
        feedback.userName,
        feedback.userEmail,
        feedback.userId,
        feedback.associatedUserName,
        feedback.message,
        ...(feedback.tags || []),
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return fields.some((value) => value.includes(term));
    });
  }, [feedbackQuery, feedbacks]);
  const featuredFeedbacks = useMemo(() => filteredFeedbacks.filter((feedback) => feedback.featured), [filteredFeedbacks]);
  const nonFeaturedFeedbacks = useMemo(() => filteredFeedbacks.filter((feedback) => !feedback.featured), [filteredFeedbacks]);

  const sanitizeFeatureCards = (cards?: FeatureCard[] | null): FeatureCard[] => {
    if (!cards) return [];
    return cards.map((card) => ({
      title: card?.title,
      desc: card?.desc,
      images: Array.isArray(card?.images) ? card.images : [],
    }));
  };

  const deriveFeatureCardsFromAi = (ai?: LandingContent["aiFeatures"]): FeatureCard[] => {
    if (!ai) return [];
    const order: Array<keyof NonNullable<LandingContent["aiFeatures"]>> = ["mixmatch", "ailisting", "search"];
    return order.reduce<FeatureCard[]>((acc, key) => {
      const node = ai?.[key];
      if (!node) return acc;
      const rawImages =
        (Array.isArray(node.images) && node.images.length > 0
          ? node.images
          : [
              ...(((node as any).girlImages || []) as unknown[]),
              ...(((node as any).boyImages || []) as unknown[]),
            ]) || [];
      const images = (rawImages as unknown[]).filter((u): u is string => typeof u === "string");
      acc.push({ title: node.title, desc: node.desc, images });
      return acc;
    }, []);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, contentRes, feedbackRes, pricingRes, tagsRes, releasesRes] = await Promise.all([
        fetch("/api/site-stats"),
        fetch("/api/landing-content"),
        fetch("/api/admin/feedback", { cache: "no-store" }),
        fetch("/api/pricing-plans"),
        fetch("/api/feedback/tags"),
        fetch("/api/admin/releases", { cache: "no-store" }),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
      }
      if (contentRes.ok) {
        const contentData = await contentRes.json();
        const hasFeatureCards = Array.isArray(contentData.featureCards);
        const normalizedCards = hasFeatureCards ? sanitizeFeatureCards(contentData.featureCards) : [];
        const fallbackCards = hasFeatureCards ? normalizedCards : deriveFeatureCardsFromAi(contentData.aiFeatures);
        setContent({
          heroTitle: contentData.heroTitle || "",
          heroSubtitle: contentData.heroSubtitle || "",
          heroCarouselImages: contentData.heroCarouselImages || [],
          featureCards: fallbackCards,
          aiFeatures: contentData.aiFeatures || {},
        });
      }
      if (feedbackRes.ok) {
        const feedbackData = await feedbackRes.json();
        const items = (feedbackData.feedbacks || []) as any[];
        setFeedbacks(
          items.map((item) => ({
            id: Number(item.id),
            userId: item.userId ?? null,
            userEmail: item.userEmail ?? null,
            userName: item.userName ?? null,
            message: item.message ?? "",
            rating: item.rating === null || item.rating === undefined ? null : Number(item.rating),
            tags: Array.isArray(item.tags) ? item.tags : [],
            featured: Boolean(item.featured),
            createdAt: item.createdAt ?? "",
            associatedUserName: item.associatedUserName ?? null,
          }))
        );
      } else {
        setFeedbacks([]);
      }
      if (pricingRes.ok) {
        const pricingData = await pricingRes.json();
        setPricingPlans(pricingData.plans);
      }
      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        setAvailableTags(tagsData.tags || []);
      }
      if (releasesRes.ok) {
        const releasesData = await releasesRes.json();
        setReleases(releasesData.releases || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  async function updateLandingContent() {
    try {
      setSaving(true);
      const response = await fetch("/api/admin/landing-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      alert(response.ok ? "Landing content updated successfully!" : "Failed to update landing content");
    } finally {
      setSaving(false);
    }
  }

  async function addFeedback() {
    if (!newFeedback.message.trim()) {
      alert("Feedback message cannot be empty");
      return;
    }
    if (newFeedback.featured && !newFeedback.userName.trim()) {
      alert("User name is required for featured feedback");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        userName: newFeedback.userName.trim() || undefined,
        userEmail: newFeedback.userEmail.trim() || undefined,
        message: newFeedback.message.trim(),
        rating: newFeedback.rating ?? undefined,
        tags: newFeedback.tags,
        featured: newFeedback.featured,
      };
      const response = await fetch("/api/admin/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        setNewFeedback({ userName: "", userEmail: "", message: "", rating: 5, tags: [], featured: true });
        fetchData();
        alert("Feedback added successfully!");
      } else {
        const data = await response.json().catch(() => null);
        alert(data?.error || "Failed to add feedback");
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleFeedbackFeatured(feedback: FeedbackItem) {
    const nextFeatured = !feedback.featured;
    if (!nextFeatured) {
      const confirmed = confirm("Remove this feedback from featured items?");
      if (!confirmed) return;
    }
    try {
      setUpdatingFeedbackId(feedback.id);
      const response = await fetch(`/api/admin/feedback/${feedback.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: nextFeatured }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        alert(data?.error || "Failed to update feedback");
        return;
      }
      fetchData();
    } finally {
      setUpdatingFeedbackId(null);
    }
  }

  async function deleteFeedback(id: number) {
    if (!confirm("Delete this feedback entry? This action cannot be undone.")) {
      return;
    }
    try {
      setDeletingFeedbackId(id);
      const response = await fetch(`/api/admin/feedback/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        alert(data?.error || "Failed to delete feedback");
        return;
      }
      fetchData();
    } finally {
      setDeletingFeedbackId(null);
    }
  }

  const formatDate = (value: string) => {
    if (!value) return "Unknown";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  async function updatePricingPlans() {
    try {
      setSaving(true);
      const response = await fetch("/api/admin/pricing-plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plans: pricingPlans }),
      });
      alert(response.ok ? "Pricing plans updated successfully!" : "Failed to update pricing plans");
    } finally {
      setSaving(false);
    }
  }

  async function uploadRelease(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    if (!supabase) {
      alert("Supabase client is not configured. Please check environment settings.");
      return;
    }

    const fileEntry = formData.get("file");
    if (!(fileEntry instanceof File)) {
      alert("Please select an .apk file to upload.");
      return;
    }
    if (fileEntry.size === 0) {
      alert("Selected file is empty.");
      return;
    }

    const versionEntry = formData.get("version");
    const version = typeof versionEntry === "string" ? versionEntry.trim() : "";
    if (!version) {
      alert("Version is required.");
      return;
    }

    const releaseNotesEntry = formData.get("releaseNotes");
    const releaseNotes = typeof releaseNotesEntry === "string" ? releaseNotesEntry : "";
    const setAsCurrent = formData.get("setAsCurrent") === "true";

    try {
      setUploadingRelease(true);
      const presignResponse = await fetch("/api/admin/releases/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: fileEntry.name,
          fileType: fileEntry.type,
          version,
          platform: "android",
        }),
      });

      if (!presignResponse.ok) {
        const data = await presignResponse.json().catch(() => null);
        alert(data?.error || "Failed to prepare upload");
        return;
      }

      const presignData: { bucket: string; path: string; token: string } = await presignResponse.json();
      if (!presignData?.bucket || !presignData?.path || !presignData?.token) {
        alert("Invalid upload configuration received.");
        return;
      }

      const { error: uploadError } = await supabase.storage
        .from(presignData.bucket)
        .uploadToSignedUrl(presignData.path, presignData.token, fileEntry);

      if (uploadError) {
        console.error("Supabase signed upload failed:", uploadError);
        alert(uploadError.message || "Failed to upload file to storage");
        return;
      }

      const finalizeResponse = await fetch("/api/admin/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version,
          releaseNotes,
          setAsCurrent,
          path: presignData.path,
          fileName: fileEntry.name,
          fileSize: fileEntry.size,
          platform: "android",
        }),
      });

      if (!finalizeResponse.ok) {
        const data = await finalizeResponse.json().catch(() => null);
        alert(data?.error || "Failed to save release");
        return;
      }

      alert("Release uploaded successfully!");
      form.reset();
      fetchData();
    } catch (error) {
      console.error("Error uploading release:", error);
      alert("Failed to upload release");
    } finally {
      setUploadingRelease(false);
    }
  }

  async function toggleReleaseCurrent(release: Release) {
    try {
      const response = await fetch(`/api/admin/releases/${release.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCurrent: !release.is_current }),
      });
      
      if (response.ok) {
        fetchData();
      } else {
        const data = await response.json().catch(() => null);
        alert(data?.error || "Failed to update release");
      }
    } catch (error) {
      console.error("Error updating release:", error);
      alert("Failed to update release");
    }
  }

  async function deleteRelease(id: number) {
    if (!confirm("Delete this release? This action cannot be undone.")) {
      return;
    }
    
    try {
      setDeletingReleaseId(id);
      const response = await fetch(`/api/admin/releases/${id}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        fetchData();
      } else {
        const data = await response.json().catch(() => null);
        alert(data?.error || "Failed to delete release");
      }
    } catch (error) {
      console.error("Error deleting release:", error);
      alert("Failed to delete release");
    } finally {
      setDeletingReleaseId(null);
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  async function addTag() {
    const trimmedTag = newTag.trim().toLowerCase();
    if (!trimmedTag) {
      alert("Tag cannot be empty");
      return;
    }
    if (availableTags.includes(trimmedTag)) {
      alert("Tag already exists");
      return;
    }

    try {
      setAddingTag(true);
      const response = await fetch("/api/admin/feedback/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: trimmedTag }),
      });

      if (response.ok) {
        setNewTag("");
        // Refresh tags list
        const tagsRes = await fetch("/api/feedback/tags");
        if (tagsRes.ok) {
          const tagsData = await tagsRes.json();
          setAvailableTags(tagsData.tags || []);
        }
      } else {
        const data = await response.json().catch(() => null);
        alert(data?.error || "Failed to add tag");
      }
    } catch (error) {
      console.error("Error adding tag:", error);
      alert("Failed to add tag");
    } finally {
      setAddingTag(false);
    }
  }

  async function deleteTag(tag: string) {
    if (!confirm(`Delete tag "${tag}"? This will only remove it from available tags if it's not in use.`)) {
      return;
    }

    try {
      setDeletingTag(tag);
      const response = await fetch(`/api/admin/feedback/tags?tag=${encodeURIComponent(tag)}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Refresh tags list
        const tagsRes = await fetch("/api/feedback/tags");
        if (tagsRes.ok) {
          const tagsData = await tagsRes.json();
          setAvailableTags(tagsData.tags || []);
          // Also remove from newFeedback if it's selected
          if (newFeedback.tags.includes(tag)) {
            setNewFeedback({
              ...newFeedback,
              tags: newFeedback.tags.filter((t) => t !== tag),
            });
          }
        }
      } else {
        const data = await response.json().catch(() => null);
        alert(data?.error || "Failed to delete tag");
      }
    } catch (error) {
      console.error("Error deleting tag:", error);
      alert("Failed to delete tag");
    } finally {
      setDeletingTag(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const applyAssetsToHero = (urls: string[]) => {
    setContent((prev) => ({ ...prev, heroCarouselImages: urls }));
  };

  const featureCards = content.featureCards || [];

  const handleFeatureCardChange = (index: number, next: FeatureCard) => {
    setContent((prev) => {
      const current = prev.featureCards ? [...prev.featureCards] : [];
      current[index] = next;
      return { ...prev, featureCards: current };
    });
  };

  const addFeatureCard = () => {
    setContent((prev) => ({
      ...prev,
      featureCards: [...(prev.featureCards || []), { title: "", desc: "", images: [] }],
    }));
  };

  const removeFeatureCard = (index: number) => {
    setContent((prev) => {
      const current = prev.featureCards ? [...prev.featureCards] : [];
      current.splice(index, 1);
      return { ...prev, featureCards: current };
    });
  };

  const moveFeatureCard = (index: number, direction: -1 | 1) => {
    setContent((prev) => {
      const current = prev.featureCards ? [...prev.featureCards] : [];
      const target = index + direction;
      if (target < 0 || target >= current.length) return prev;
      [current[index], current[target]] = [current[target], current[index]];
      return { ...prev, featureCards: current };
    });
  };

  const getFeatureAssetPrefix = (index: number) => `assets/feature${index + 1}/`;

  const applyFeatureAssets = (index: number, urls: string[]) => {
    const card = featureCards[index] || { title: "", desc: "", images: [] };
    handleFeatureCardChange(index, { ...card, images: urls });
  };
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold mb-8">Content Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* (Moved) Site Statistics will appear after Feedback */}

        {/* Landing Page Content (full width) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Landing Page Content</h2>
          {/* Hero carousel assets */}
          <div className="mb-6">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm text-gray-600">Hero carousel screenshots</span>
              <span className="text-xs text-gray-500">assets/carousel/</span>
            </div>
            <AssetLibraryManager title="Assets (assets/carousel)" prefix="assets/carousel/" initialSelectedUrls={content.heroCarouselImages || []} onApply={applyAssetsToHero} />
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="heroTitle" className="block text-sm font-medium text-gray-700 mb-1">Hero Title</label>
              <input id="heroTitle" type="text" value={content.heroTitle} onChange={(e) => setContent({ ...content, heroTitle: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label htmlFor="heroSubtitle" className="block text-sm font-medium text-gray-700 mb-1">Hero Subtitle</label>
              <textarea id="heroSubtitle" value={content.heroSubtitle} onChange={(e) => setContent({ ...content, heroSubtitle: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Feature Cards</h3>
                <button
                  type="button"
                  onClick={addFeatureCard}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  + Add Card
                </button>
              </div>
              {featureCards.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                  No feature cards yet. Click “Add Card” to create one.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {featureCards.map((card, index) => {
                    const prefix = getFeatureAssetPrefix(index);
                    return (
                      <div key={`feature-card-${index}`} className="space-y-3">
                        <FeatureCardManager
                          label={`Feature ${index + 1}`}
                          value={card}
                          showImages={false}
                          onChange={(next) => handleFeatureCardChange(index, next)}
                        />
                        <div className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Screenshots</span>
                            <span className="text-xs text-gray-500">{prefix}</span>
                          </div>
                          <AssetLibraryManager
                            title={`Assets (${prefix})`}
                            prefix={prefix}
                            initialSelectedUrls={card.images || []}
                            displayMode="list"
                            className="shadow-none border border-dashed border-gray-300"
                            onApply={(urls: string[]) => applyFeatureAssets(index, urls)}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <div className="text-gray-500">Card #{index + 1}</div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => moveFeatureCard(index, -1)}
                              disabled={index === 0}
                              className="px-2 py-1 border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveFeatureCard(index, 1)}
                              disabled={index === featureCards.length - 1}
                              className="px-2 py-1 border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => removeFeatureCard(index)}
                              className="px-2 py-1 border border-red-200 text-red-700 rounded-md hover:bg-red-50"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button onClick={updateLandingContent} disabled={saving} className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50">{saving ? "Updating..." : "Update Content"}</button>
          </div>
        </div>

        {/* Featured Feedback (merged) */}
  <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-gray-200 max-h-[calc(100vh-12rem)] overflow-hidden flex flex-col">
          <h2 className="text-xl font-semibold mb-4">Featured Feedback</h2>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
            <div className="text-sm text-gray-600">
              Showing {filteredFeedbacks.length} of {feedbacks.length} entries
              {feedbackQuery.trim() ? ` for “${feedbackQuery.trim()}”` : ""}
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:flex-none md:w-64">
                <input
                  type="search"
                  value={feedbackQuery}
                  onChange={(e) => setFeedbackQuery(e.target.value)}
                  placeholder="Search by name, email, tag, or message…"
                  className="w-full rounded-md border border-gray-300 pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {feedbackQuery && (
                  <button
                    type="button"
                    onClick={() => setFeedbackQuery("")}
                    className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600 text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch min-h-0 flex-1 overflow-hidden">
            <div className="flex flex-col min-h-0">
              <h3 className="font-medium mb-2">Add New</h3>
              <div className="space-y-4 flex-1">
                <div>
                  <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                  <input
                    id="userName"
                    type="text"
                    value={newFeedback.userName}
                    onChange={(e) => setNewFeedback({ ...newFeedback, userName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Name to show publicly"
                  />
                  <p className="text-xs text-gray-500 mt-1">Required when marking the feedback as featured.</p>
                </div>
                <div>
                  <label htmlFor="userEmail" className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
                  <input
                    id="userEmail"
                    type="email"
                    value={newFeedback.userEmail}
                    onChange={(e) => setNewFeedback({ ...newFeedback, userEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="testimonialText" className="block text-sm font-medium text-gray-700 mb-1">Feedback Message</label>
                  <textarea
                    id="testimonialText"
                    value={newFeedback.message}
                    onChange={(e) => setNewFeedback({ ...newFeedback, message: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="What did they say?"
                  />
                </div>
                <div>
                  <label htmlFor="testimonialRating" className="block text-sm font-medium text-gray-700 mb-1">Rating (1-5, optional)</label>
                  <input
                    id="testimonialRating"
                    type="number"
                    min={1}
                    max={5}
                    value={newFeedback.rating ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "") {
                        setNewFeedback({ ...newFeedback, rating: null });
                        return;
                      }
                      const numeric = Number(value);
                      if (Number.isNaN(numeric)) {
                        return;
                      }
                      const clamped = Math.max(1, Math.min(5, Math.round(numeric)));
                      setNewFeedback({ ...newFeedback, rating: clamped });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <div className="block text-sm font-medium text-gray-700 mb-1">Tags</div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {availableTags.map((tag) => {
                      const checked = newFeedback.tags.includes(tag);
                      return (
                        <label key={tag} className={`group relative inline-flex items-center gap-1 text-xs px-2 py-1 pr-1 rounded-full cursor-pointer border transition-colors ${checked ? 'bg-[var(--brand-color)] text-white border-[var(--brand-color)]' : 'bg-white text-black border-black/10 hover:border-gray-300'}`}>
                          <input type="checkbox" className="hidden" checked={checked} onChange={(e) => {
                            setNewFeedback({
                              ...newFeedback,
                              tags: e.target.checked ? [...newFeedback.tags, tag] : newFeedback.tags.filter((t) => t !== tag),
                            });
                          }} />
                          <span>#{tag}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              deleteTag(tag);
                            }}
                            disabled={deletingTag === tag}
                            className={`ml-1 w-4 h-4 flex items-center justify-center rounded-full transition-colors disabled:opacity-50 text-xs font-bold ${checked ? 'hover:bg-white/20 text-white' : 'hover:bg-red-100 text-gray-500 hover:text-red-600'}`}
                            title="Delete tag"
                          >
                            {deletingTag === tag ? "..." : "×"}
                          </button>
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                      placeholder="Add new tag"
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      disabled={addingTag || !newTag.trim()}
                      className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Add tag"
                    >
                      {addingTag ? "..." : "+"}
                    </button>
                  </div>
                </div>
                <div className="flex items-center">
                  <input id="testimonialFeatured" type="checkbox" checked={newFeedback.featured} onChange={(e) => setNewFeedback({ ...newFeedback, featured: e.target.checked })} className="mr-2" />
                  <label htmlFor="testimonialFeatured" className="text-sm font-medium text-gray-700">Featured on homepage</label>
                </div>
                <button
                  onClick={addFeedback}
                  disabled={
                    saving ||
                    !newFeedback.message.trim() ||
                    (newFeedback.featured && !newFeedback.userName.trim())
                  }
                  className="mt-auto w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {saving ? "Adding..." : "Add Feedback"}
                </button>
              </div>
            </div>
            <div className="flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto space-y-6 pr-1">
                <section>
                  <h3 className="font-medium mb-2">Current Featured</h3>
                  <div className="space-y-4">
                    {featuredFeedbacks.length === 0 ? (
                      <div className="border border-dashed border-gray-300 rounded-lg p-6 text-sm text-center text-gray-500 bg-gray-50">
                        {feedbackQuery.trim()
                          ? "No featured feedback matches your search."
                          : "No featured feedback yet. Add one on the left to populate the landing page."}
                      </div>
                    ) : (
                      featuredFeedbacks.map((feedback) => (
                        <div key={feedback.id} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-xs uppercase tracking-wide text-gray-400">Feedback #{feedback.id}</div>
                              <div className="text-base font-semibold text-gray-900">
                                {feedback.userName || "Anonymous"}
                              </div>
                              <div className="text-xs text-gray-500">
                                {feedback.userEmail || "No email provided"}
                              </div>
                              {feedback.userId && (
                                <div className="text-xs text-gray-500">
                                  User ID: {feedback.userId}
                                  {feedback.associatedUserName ? ` (${feedback.associatedUserName})` : ""}
                                </div>
                              )}
                            </div>
                            <div className="text-right text-sm text-gray-600">
                              {typeof feedback.rating === "number" && !Number.isNaN(feedback.rating) ? (
                                <div className="text-yellow-500 font-semibold">
                                  {"★".repeat(Math.round(feedback.rating))}{"☆".repeat(5 - Math.round(feedback.rating))}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400">No rating</div>
                              )}
                              <div className="text-xs text-gray-400 mt-1">{formatDate(feedback.createdAt)}</div>
                            </div>
                          </div>

                          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm text-gray-800 whitespace-pre-wrap">
                            {feedback.message}
                          </div>

                          {feedback.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {feedback.tags.map((tag) => (
                                <span key={tag} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100">
                            <div className="text-xs text-gray-500">
                              Featured · Added {formatDate(feedback.createdAt)}
                            </div>
                            <div className="flex items-center gap-2">
                              {feedback.userEmail && (
                                <button
                                  onClick={() => {
                                    window.location.href = `mailto:${feedback.userEmail}?subject=Re: Your feedback&body=Hi ${feedback.userName || ""},%0A%0AThank you for your feedback about our platform.%0A%0ABest regards,%0ATop Care Fashion Team`;
                                  }}
                                  className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                  Reply via Email
                                </button>
                              )}
                              <button
                                onClick={() => toggleFeedbackFeatured(feedback)}
                                disabled={updatingFeedbackId === feedback.id}
                                className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                              >
                                {updatingFeedbackId === feedback.id ? "Saving..." : "Remove Featured"}
                              </button>
                              <button
                                onClick={() => deleteFeedback(feedback.id)}
                                disabled={deletingFeedbackId === feedback.id}
                                className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                              >
                                {deletingFeedbackId === feedback.id ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="font-medium mb-2">Other Feedback</h3>
                  <div className="space-y-4">
                    {nonFeaturedFeedbacks.length === 0 ? (
                      <div className="border border-dashed border-gray-300 rounded-lg p-6 text-sm text-center text-gray-500 bg-gray-50">
                        {feedbackQuery.trim()
                          ? "No feedback matches your search."
                          : "All feedback is currently featured."}
                      </div>
                    ) : (
                      nonFeaturedFeedbacks.map((feedback) => (
                        <div key={feedback.id} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-xs uppercase tracking-wide text-gray-400">Feedback #{feedback.id}</div>
                              <div className="text-base font-semibold text-gray-900">
                                {feedback.userName || "Anonymous"}
                              </div>
                              <div className="text-xs text-gray-500">
                                {feedback.userEmail || "No email provided"}
                              </div>
                              {feedback.userId && (
                                <div className="text-xs text-gray-500">
                                  User ID: {feedback.userId}
                                  {feedback.associatedUserName ? ` (${feedback.associatedUserName})` : ""}
                                </div>
                              )}
                            </div>
                            <div className="text-right text-sm text-gray-600">
                              {typeof feedback.rating === "number" && !Number.isNaN(feedback.rating) ? (
                                <div className="text-yellow-500 font-semibold">
                                  {"★".repeat(Math.round(feedback.rating))}{"☆".repeat(5 - Math.round(feedback.rating))}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400">No rating</div>
                              )}
                              <div className="text-xs text-gray-400 mt-1">{formatDate(feedback.createdAt)}</div>
                            </div>
                          </div>

                          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm text-gray-800 whitespace-pre-wrap">
                            {feedback.message}
                          </div>

                          {feedback.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {feedback.tags.map((tag) => (
                                <span key={tag} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100">
                            <div className="text-xs text-gray-500">
                              Submitted {formatDate(feedback.createdAt)}
                            </div>
                            <div className="flex items-center gap-2">
                              {feedback.userEmail && (
                                <button
                                  onClick={() => {
                                    window.location.href = `mailto:${feedback.userEmail}?subject=Re: Your feedback&body=Hi ${feedback.userName || ""},%0A%0AThank you for your feedback about our platform.%0A%0ABest regards,%0ATop Care Fashion Team`;
                                  }}
                                  className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                  Reply via Email
                                </button>
                              )}
                              <button
                                onClick={() => toggleFeedbackFeatured(feedback)}
                                disabled={updatingFeedbackId === feedback.id}
                                className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                              >
                                {updatingFeedbackId === feedback.id ? "Saving..." : "Mark Featured"}
                              </button>
                              <button
                                onClick={() => deleteFeedback(feedback.id)}
                                disabled={deletingFeedbackId === feedback.id}
                                className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                              >
                                {deletingFeedbackId === feedback.id ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>

        {/* Site Statistics (moved after feedback) */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Site Statistics</h2>
          <p className="text-sm text-gray-600 mb-4">Real-time statistics calculated from the database. Ratings are from user feedback.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Users</label>
              <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-900 font-semibold text-lg">
                {stats.users.toLocaleString()}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Listings</label>
              <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-900 font-semibold text-lg">
                {stats.listings.toLocaleString()}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Items Sold</label>
              <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-900 font-semibold text-lg">
                {stats.sold.toLocaleString()}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Average Rating (from Feedback)</label>
              <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-900 font-semibold text-lg flex items-center gap-2">
                <span>{stats.rating.toFixed(1)}</span>
                <span className="text-yellow-500">{"★".repeat(Math.round(stats.rating))}</span>
              </div>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh Statistics"}
            </button>
          </div>
        </div>

        {/* Pricing Plans Management */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Pricing Plans Management</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {pricingPlans.map((plan, planIndex) => (
              <div key={plan.type} className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 capitalize">{plan.type} Plan</h3>
                <div className="space-y-3">
                  <div>
                    <label htmlFor={`${plan.type}-name`} className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                    <input id={`${plan.type}-name`} type="text" value={plan.name} onChange={(e) => { const updated = [...pricingPlans]; updated[planIndex].name = e.target.value; setPricingPlans(updated); }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label htmlFor={`${plan.type}-description`} className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input id={`${plan.type}-description`} type="text" value={plan.description} onChange={(e) => { const updated = [...pricingPlans]; updated[planIndex].description = e.target.value; setPricingPlans(updated); }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor={`${plan.type}-commission`} className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%)</label>
                      <input id={`${plan.type}-commission`} type="number" step="0.01" value={plan.commissionRate} onChange={(e) => { const updated = [...pricingPlans]; updated[planIndex].commissionRate = e.target.value; setPricingPlans(updated); }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label htmlFor={`${plan.type}-promotion`} className="block text-sm font-medium text-gray-700 mb-1">Promotion Price</label>
                      <input id={`${plan.type}-promotion`} type="number" step="0.01" value={plan.promotionPrice} onChange={(e) => { const updated = [...pricingPlans]; updated[planIndex].promotionPrice = e.target.value; setPricingPlans(updated); }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor={`${plan.type}-promotion-discount`} className="block text-sm font-medium text-gray-700 mb-1">Promotion Discount (%)</label>
                      <input id={`${plan.type}-promotion-discount`} type="number" step="0.01" value={plan.promotionDiscount || ''} onChange={(e) => { const updated = [...pricingPlans]; updated[planIndex].promotionDiscount = e.target.value || null; setPricingPlans(updated); }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label htmlFor={`${plan.type}-listing-limit`} className="block text-sm font-medium text-gray-700 mb-1">Listing Limit</label>
                      <input id={`${plan.type}-listing-limit`} type="number" value={plan.listingLimit || ''} onChange={(e) => { const updated = [...pricingPlans]; updated[planIndex].listingLimit = e.target.value ? Number(e.target.value) : null; setPricingPlans(updated); }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor={`${plan.type}-mixmatch-limit`} className="block text-sm font-medium text-gray-700 mb-1">MixMatch Limit</label>
                      <input id={`${plan.type}-mixmatch-limit`} type="number" value={plan.mixMatchLimit || ''} onChange={(e) => { const updated = [...pricingPlans]; updated[planIndex].mixMatchLimit = e.target.value ? Number(e.target.value) : null; setPricingPlans(updated); }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label htmlFor={`${plan.type}-free-promotion-credits`} className="block text-sm font-medium text-gray-700 mb-1">Free Promotion Credits</label>
                      <input id={`${plan.type}-free-promotion-credits`} type="number" value={plan.freePromotionCredits || ''} onChange={(e) => { const updated = [...pricingPlans]; updated[planIndex].freePromotionCredits = e.target.value ? Number(e.target.value) : 0; setPricingPlans(updated); }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor={`${plan.type}-seller-badge`} className="block text-sm font-medium text-gray-700 mb-1">Seller Badge</label>
                    <input id={`${plan.type}-seller-badge`} type="text" value={plan.sellerBadge || ''} onChange={(e) => { const updated = [...pricingPlans]; updated[planIndex].sellerBadge = e.target.value || null; setPricingPlans(updated); }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label htmlFor={`${plan.type}-features`} className="block text-sm font-medium text-gray-700 mb-1">Features (comma-separated)</label>
                    <input id={`${plan.type}-features`} type="text" value={plan.features?.join(', ') || ''} onChange={(e) => { const updated = [...pricingPlans]; updated[planIndex].features = e.target.value ? e.target.value.split(',').map(f => f.trim()).filter(f => f) : []; setPricingPlans(updated); }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Feature 1, Feature 2, Feature 3" />
                  </div>
                  <div className="flex items-center">
                    <input id={`${plan.type}-popular`} type="checkbox" checked={plan.isPopular} onChange={(e) => { const updated = [...pricingPlans]; updated[planIndex].isPopular = e.target.checked; setPricingPlans(updated); }} className="mr-2" />
                    <label htmlFor={`${plan.type}-popular`} className="text-sm font-medium text-gray-700">Mark as Popular</label>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={updatePricingPlans} disabled={saving} className="mt-4 w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50">{saving ? "Updating..." : "Update Pricing Plans"}</button>
        </div>

        {/* Release Management */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">App Release Management</h2>
          <p className="text-sm text-gray-600 mb-6">Manage app releases for Android and iOS. Upload new versions and set which version users will download from the homepage.</p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload Form */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Upload New Release</h3>
              <form onSubmit={uploadRelease} className="space-y-3">
                <div>
                  <label htmlFor="release-version" className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                  <input 
                    id="release-version" 
                    name="version" 
                    type="text" 
                    required 
                    placeholder="e.g., 1.0.0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div>
                  <label htmlFor="release-file" className="block text-sm font-medium text-gray-700 mb-1">File</label>
                  <input 
                    id="release-file" 
                    name="file" 
                    type="file" 
                    required
                    accept=".apk"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                  />
                  <p className="text-xs text-gray-500 mt-1">Accepted: .apk files</p>
                </div>
                <div>
                  <label htmlFor="release-notes" className="block text-sm font-medium text-gray-700 mb-1">Release Notes (optional)</label>
                  <textarea 
                    id="release-notes" 
                    name="releaseNotes" 
                    rows={3}
                    placeholder="What's new in this version?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                  />
                </div>
                <div className="flex items-center">
                  <input 
                    id="set-as-current" 
                    name="setAsCurrent" 
                    type="checkbox" 
                    value="true"
                    className="mr-2" 
                  />
                  <label htmlFor="set-as-current" className="text-sm font-medium text-gray-700">Set as current version</label>
                </div>
                <button 
                  type="submit" 
                  disabled={uploadingRelease}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {uploadingRelease ? "Uploading..." : "Upload Release"}
                </button>
              </form>
            </div>

            {/* Android Releases */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="text-green-600">🤖</span> Android Releases
              </h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {releases.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No Android releases yet</p>
                ) : (
                  releases.map((release) => (
                    <div key={release.id} className={`border rounded-lg p-3 ${release.is_current ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-semibold text-sm">{release.version}</div>
                          <div className="text-xs text-gray-500">{formatDate(release.created_at)}</div>
                        </div>
                        {release.is_current && (
                          <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full">CURRENT</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        <div>{release.file_name}</div>
                        <div>{formatFileSize(release.file_size)}</div>
                      </div>
                      {release.release_notes && (
                        <div className="text-xs text-gray-700 bg-white p-2 rounded border border-gray-200 mb-2">
                          {release.release_notes}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleReleaseCurrent(release)}
                          className={`flex-1 text-xs px-2 py-1 rounded ${release.is_current ? 'bg-gray-300 text-gray-700' : 'bg-green-600 text-white hover:bg-green-700'}`}
                        >
                          {release.is_current ? 'Current' : 'Set Current'}
                        </button>
                        <button
                          onClick={() => deleteRelease(release.id)}
                          disabled={deletingReleaseId === release.id}
                          className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          {deletingReleaseId === release.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

