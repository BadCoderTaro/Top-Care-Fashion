"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthContext";

type QA = { q: string; a?: string; user?: string; ts: number; category?: string };

const FAQ_CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "General", label: "General" },
  { value: "Account", label: "Account" },
  { value: "Products", label: "Products" },
  { value: "Orders", label: "Orders" },
  { value: "Shipping", label: "Shipping" },
  { value: "Returns", label: "Returns" },
  { value: "Technical", label: "Technical" },
  { value: "Other", label: "Other" },
];

export default function FAQPage() {
  const { isAuthenticated, user } = useAuth();
  const [list, setList] = useState<QA[]>([]);
  const [q, setQ] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const load = async () => {
    try {
      const params = new URLSearchParams();
      params.append("status", "answered");
      if (searchQuery) params.append("search", searchQuery);
      if (categoryFilter) params.append("category", categoryFilter);

      const queryString = params.toString();
      const url = `/api/faq${queryString ? `?${queryString}` : ""}`;

      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json();
      setList((j.faqs || []).map((x: any) => ({
        q: x.question,
        a: x.answer || undefined,
        ts: x.id,
        category: x.category || undefined
      })));
    } catch {
      // fallback to empty
      setList([]);
    }
  };

  useEffect(() => {
    load();
  }, [searchQuery, categoryFilter]);

  async function addQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    try {
      await fetch("/api/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q.trim(),
          category: selectedCategory || null
        })
      });
      setQ("");
      setSelectedCategory("");
      await load();
    } catch {
      // show optimistic add locally if POST fails
      setList([{
        q: q.trim(),
        user: user?.username || user?.email,
        ts: Date.now(),
        category: selectedCategory || undefined
      }, ...list]);
      setQ("");
      setSelectedCategory("");
    }
  }

  return (
    <section className="max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight">FAQ</h1>
      <p className="text-sm text-black/70 mt-1">Find answers to common questions or ask your own.</p>

      {/* Search and Filter */}
      <div className="mt-6 space-y-3">
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-black/70 mb-1">
            Search Questions
          </label>
          <input
            id="search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by keyword..."
            className="w-full border border-black/10 rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="category-filter" className="block text-sm font-medium text-black/70 mb-1">
            Filter by Category
          </label>
          <select
            id="category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full border border-black/10 rounded-md px-3 py-2"
          >
            {FAQ_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* FAQ List */}
      <div className="mt-8 space-y-4">
        {list.length === 0 && (
          <p className="text-sm text-black/60">
            {searchQuery || categoryFilter ? "No matching questions found." : "No questions yet."}
          </p>
        )}
        {list.map((item) => (
          <div key={item.ts} className="rounded-xl border border-black/10 p-4 bg-white">
            <div className="flex items-start justify-between mb-2">
              <div className="text-sm font-medium">Q: {item.q}</div>
              {item.category && (
                <span className="ml-2 px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                  {item.category}
                </span>
              )}
            </div>
            {item.a ? (
              <div className="text-sm mt-1 text-black/70 whitespace-pre-wrap">A: {item.a}</div>
            ) : (
              <div className="text-xs text-black/50 mt-1">Awaiting answer</div>
            )}
            {item.user && <div className="text-xs text-black/50 mt-2">From: {item.user}</div>}
          </div>
        ))}
      </div>

      {/* Ask Question Form - Moved to Bottom */}
      {isAuthenticated ? (
        <form onSubmit={addQuestion} className="mt-8 space-y-3 p-4 border border-black/10 rounded-md bg-white shadow-sm">
          <h3 className="text-sm font-medium">Ask a Question</h3>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type your question..."
            className="w-full border border-black/10 rounded-md px-3 py-2"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full border border-black/10 rounded-md px-3 py-2"
          >
            <option value="">Select a category (optional)</option>
            {FAQ_CATEGORIES.filter(c => c.value).map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-[var(--brand-color)] text-white px-4 py-2 text-sm hover:opacity-90"
          >
            Submit Question
          </button>
        </form>
      ) : (
        <div className="mt-8 p-4 border border-black/10 rounded-md bg-gray-50 text-center">
          <p className="text-sm text-black/70">Please sign in to ask a question.</p>
        </div>
      )}
    </section>
  );
}
