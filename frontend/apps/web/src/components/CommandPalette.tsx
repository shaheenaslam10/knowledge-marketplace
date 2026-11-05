"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  User,
  BookOpen,
  FolderOpen,
  DollarSign,
  FilePlus,
  Compass,
  ArrowRight,
  Sparkles,
  Layers,
  X,
} from "lucide-react";
import { useSession } from "@/features/auth/SessionProvider";
import { expertsApi } from "@/features/experts/api";
import { catalogApi } from "@/features/catalog/api";
import type { PublicExpert } from "@/features/experts/types";
import type { KnowledgeProduct } from "@/features/catalog/types";

interface SearchResultItem {
  id: string;
  category: "Specialists" | "Catalog" | "Subjects" | "Quick Actions";
  title: string;
  subtitle?: string;
  href: string;
  icon: typeof Search;
  badge?: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [experts, setExperts] = useState<PublicExpert[]>([]);
  const [products, setProducts] = useState<KnowledgeProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { user } = useSession();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Global keyboard listener: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Listen for custom trigger event
  useEffect(() => {
    const handleTrigger = () => setOpen(true);
    window.addEventListener("open-command-palette", handleTrigger);
    return () => window.removeEventListener("open-command-palette", handleTrigger);
  }, []);

  // Auto focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  // Live federated query search
  useEffect(() => {
    if (!open) return;
    if (!query.trim()) {
      setExperts([]);
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const [expRes, catRes] = await Promise.allSettled([
          expertsApi.directory({ q: query.trim() }),
          catalogApi.list({ q: query.trim() }),
        ]);

        if (expRes.status === "fulfilled" && expRes.value?.results) {
          setExperts(expRes.value.results.slice(0, 4));
        } else {
          setExperts([]);
        }

        if (catRes.status === "fulfilled" && catRes.value?.results) {
          setProducts(catRes.value.results.slice(0, 4));
        } else {
          setProducts([]);
        }
      } catch {
        // graceful fallback
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, open]);

  // Quick actions list based on auth state
  const quickActions: SearchResultItem[] = [
    {
      id: "act-request",
      category: "Quick Actions",
      title: "Post a New Request",
      subtitle: "Match with elite verified subject specialists",
      href: "/requests/new",
      icon: FilePlus,
      badge: "Instant Match",
    },
    {
      id: "act-catalog",
      category: "Quick Actions",
      title: "Browse Knowledge Catalog",
      subtitle: "Study guides, code templates, masterclasses",
      href: "/catalog",
      icon: BookOpen,
      badge: "Curated",
    },
    {
      id: "act-experts",
      category: "Quick Actions",
      title: "Explore Approved Specialists",
      subtitle: "Top-tier vetted experts with direct session booking",
      href: "/experts",
      icon: Compass,
      badge: "Vetted",
    },
    {
      id: "act-vault",
      category: "Quick Actions",
      title: "Open Knowledge Vault",
      subtitle: "Unlocked digital assets, scratchpads & tax invoices",
      href: "/vault",
      icon: FolderOpen,
      badge: "Library",
    },
    {
      id: "act-orders",
      category: "Quick Actions",
      title: "View Active Orders & Workspaces",
      subtitle: "Live sessions, deliveries and escrow status",
      href: "/orders",
      icon: Layers,
    },
  ];

  if (user?.roles.expert) {
    quickActions.push({
      id: "act-earnings",
      category: "Quick Actions",
      title: "Specialist Earnings & Payout Center",
      subtitle: "Withdrawable balance, GMV analytics and instant payouts",
      href: "/expert/earnings",
      icon: DollarSign,
      badge: "85% Split",
    });
  }

  // Common subjects for rapid jump
  const subjectActions: SearchResultItem[] = [
    { id: "subj-python", category: "Subjects", title: "Python & Data Science", href: "/subjects/python", icon: Sparkles },
    { id: "subj-stats", category: "Subjects", title: "Statistics & Probability", href: "/subjects/statistics", icon: Sparkles },
    { id: "subj-web", category: "Subjects", title: "Web & Full-Stack Development", href: "/subjects/web-development", icon: Sparkles },
    { id: "subj-calc", category: "Subjects", title: "Calculus & Linear Algebra", href: "/subjects/calculus", icon: Sparkles },
  ];

  // Aggregate items
  const items: SearchResultItem[] = [];

  if (query.trim()) {
    // Add matching experts
    experts.forEach((exp) => {
      items.push({
        id: `exp-${exp.slug}`,
        category: "Specialists",
        title: exp.display_name,
        subtitle: `${exp.headline} · ${exp.rating_avg ? `${exp.rating_avg}★` : "Top Specialist"}`,
        href: `/experts/${exp.slug}`,
        icon: User,
        badge: exp.availability === "available" ? "Bookable" : undefined,
      });
    });

    // Add matching products
    products.forEach((prod) => {
      items.push({
        id: `prod-${prod.slug}`,
        category: "Catalog",
        title: prod.title,
        subtitle: `${prod.summary} · by ${prod.expert_name}`,
        href: `/catalog`,
        icon: BookOpen,
        badge: prod.price_display,
      });
    });

    // Filter quick actions and subjects by query
    const qLower = query.toLowerCase();
    quickActions
      .filter((a) => a.title.toLowerCase().includes(qLower) || (a.subtitle && a.subtitle.toLowerCase().includes(qLower)))
      .forEach((a) => items.push(a));

    subjectActions
      .filter((s) => s.title.toLowerCase().includes(qLower))
      .forEach((s) => items.push(s));
  } else {
    // Default view: Quick actions followed by Subjects
    items.push(...quickActions);
    items.push(...subjectActions);
  }

  const navigateTo = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  // Keyboard navigation inside list
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (items.length > 0 ? (prev + 1) % items.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (items.length > 0 ? (prev - 1 + items.length) % items.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[selectedIndex]) {
        navigateTo(items[selectedIndex].href);
      }
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border/80 bg-background shadow-2xl ring-1 ring-black/5 dark:ring-white/10 transition-all transform animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-border/80 px-4 py-3.5 bg-surface-1/50">
          <Search className="size-5 text-muted-foreground shrink-0 mr-3 text-primary" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-results"
            className="w-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted focus:outline-none"
            placeholder="Type a command or search specialists, catalog products, topics..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            data-testid="command-palette-input"
          />
          {loading && (
            <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2 shrink-0" />
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1 rounded-md text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
            aria-label="Close command palette"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Results / Suggestions Container */}
        <div
          id="command-palette-results"
          role="listbox"
          className="max-h-96 overflow-y-auto p-2 space-y-1 divide-y divide-border/40"
        >
          {items.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted">
              No matching specialists, products or commands found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            (() => {
              // Group by category
              const groups: Record<string, SearchResultItem[]> = {};
              items.forEach((item) => {
                if (!groups[item.category]) groups[item.category] = [];
                groups[item.category].push(item);
              });

              let currentIndex = 0;

              return Object.entries(groups).map(([cat, catItems]) => (
                <div key={cat} className="pt-2 first:pt-0">
                  <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted">
                    {cat}
                  </div>
                  <div className="space-y-0.5">
                    {catItems.map((item) => {
                      const itemIdx = currentIndex++;
                      const isSelected = itemIdx === selectedIndex;
                      const Icon = item.icon;

                      return (
                        <div
                          key={item.id}
                          role="option"
                          aria-selected={isSelected}
                          className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-colors ${
                            isSelected
                              ? "bg-primary text-white font-semibold shadow-sm"
                              : "text-foreground hover:bg-surface-2"
                          }`}
                          onMouseEnter={() => setSelectedIndex(itemIdx)}
                          onClick={() => navigateTo(item.href)}
                          data-testid={`command-item-${item.id}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`flex size-8 items-center justify-center rounded-lg ${
                                isSelected ? "bg-white/20 text-white" : "bg-surface-2 text-primary"
                              }`}
                            >
                              <Icon className="size-4 shrink-0" />
                            </div>
                            <div className="truncate">
                              <p className={`truncate text-xs ${isSelected ? "text-white" : "text-foreground font-medium"}`}>
                                {item.title}
                              </p>
                              {item.subtitle && (
                                <p
                                  className={`truncate text-[11px] ${
                                    isSelected ? "text-white/80" : "text-muted"
                                  }`}
                                >
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            {item.badge && (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  isSelected
                                    ? "bg-white/20 text-white"
                                    : "bg-surface-2 text-muted-foreground border border-border/80"
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                            <ArrowRight
                              className={`size-3.5 transition-transform ${
                                isSelected ? "translate-x-0.5 text-white" : "opacity-0 group-hover:opacity-100 text-muted"
                              }`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()
          )}
        </div>

        {/* Keyboard Footer Helper */}
        <div className="flex items-center justify-between border-t border-border/80 bg-surface-1/70 px-4 py-2.5 text-[11px] text-muted">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border/80 bg-surface-2 px-1.5 py-0.5 font-mono text-[10px]">↑</kbd>
              <kbd className="rounded border border-border/80 bg-surface-2 px-1.5 py-0.5 font-mono text-[10px]">↓</kbd>
              <span className="ml-1">Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border/80 bg-surface-2 px-1.5 py-0.5 font-mono text-[10px]">↵</kbd>
              <span className="ml-1">Select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border/80 bg-surface-2 px-1.5 py-0.5 font-mono text-[10px]">ESC</kbd>
              <span className="ml-1">Close</span>
            </span>
          </div>
          <span className="font-semibold text-primary">Knowledge Marketplace Federated Omnibox</span>
        </div>
      </div>
    </div>
  );
}
