"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { BookOpen, PlusCircle, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/auth/SessionProvider";
import { CatalogGrid } from "@/features/catalog/components/catalog-grid";
import { PurchaseDrawer } from "@/features/catalog/components/purchase-drawer";
import { PublishProductDrawer } from "@/features/catalog/components/publish-product-drawer";
import { catalogApi } from "@/features/catalog/api";
import type { KnowledgeProduct, KnowledgePurchase } from "@/features/catalog/types";

export default function CatalogPage() {
  const { user, status } = useSession();
  const [selected, setSelected] = useState<KnowledgeProduct | null>(null);
  const [showPublish, setShowPublish] = useState(false);
  const [purchasedIds, setPurchasedIds] = useState<Set<number>>(new Set());
  const [purchasedProducts, setPurchasedProducts] = useState<KnowledgePurchase[]>([]);
  const [tab, setTab] = useState<"browse" | "my-products" | "my-purchases">("browse");

  // Load purchased ids for "owned" badges
  useEffect(() => {
    if (user) {
      catalogApi.myPurchases().then((purchases) => {
        setPurchasedProducts(purchases);
        setPurchasedIds(new Set(purchases.map((p) => p.product.id)));
      }).catch(() => {});
    }
  }, [user]);

  const handlePurchased = useCallback((purchase: KnowledgePurchase) => {
    setPurchasedIds((prev) => new Set([...prev, purchase.product.id]));
    setPurchasedProducts((prev) => [purchase, ...prev]);
  }, []);

  const isExpert = user && (user.roles?.expert ?? false);
  const isAuthenticated = status === "authenticated" && !!user;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="size-5 text-primary" />
            <span className="text-xs font-semibold text-muted uppercase tracking-widest">Sprint 4</span>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            Knowledge Catalog
          </h1>
          <p className="mt-1.5 text-sm text-muted max-w-xl">
            Instant-access digital guides, templates, and masterclasses from verified specialists.
            Purchase once, unlock forever.
          </p>
        </div>
        {isExpert && (
          <Button
            variant="glow"
            size="sm"
            className="gap-2 font-bold self-start sm:self-auto"
            onClick={() => setShowPublish(true)}
          >
            <PlusCircle className="size-4" />
            Publish Product
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { key: "browse", label: "Browse Catalog" },
          ...(isAuthenticated
            ? [
                ...(isExpert ? [{ key: "my-products", label: "My Products" }] : []),
                { key: "my-purchases", label: "My Purchases" },
              ]
            : []),
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "browse" && (
        <Suspense fallback={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        }>
          <CatalogGrid
            onSelect={setSelected}
            purchasedIds={purchasedIds}
          />
        </Suspense>
      )}

      {tab === "my-products" && isExpert && (
        <ExpertProductsPanel onPublish={() => setShowPublish(true)} />
      )}

      {tab === "my-purchases" && isAuthenticated && (
        <MyPurchasesPanel purchases={purchasedProducts} />
      )}

      {/* Purchase drawer */}
      {selected && (
        <PurchaseDrawer
          product={selected}
          onClose={() => setSelected(null)}
          onPurchased={handlePurchased}
          isAuthenticated={isAuthenticated}
          alreadyPurchased={purchasedIds.has(selected.id)}
        />
      )}

      {/* Publish product drawer (expert) */}
      {showPublish && (
        <PublishProductDrawer
          onClose={() => setShowPublish(false)}
          onPublished={() => { setShowPublish(false); setTab("my-products"); }}
        />
      )}
    </div>
  );
}

function ExpertProductsPanel({ onPublish }: { onPublish: () => void }) {
  const [products, setProducts] = useState<KnowledgeProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    catalogApi.myProducts().then(setProducts).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
  </div>;

  if (products.length === 0) return (
    <div className="text-center py-20 text-muted space-y-3">
      <PlusCircle className="size-10 mx-auto text-muted/40" />
      <p className="font-semibold">No products yet</p>
      <p className="text-sm">Publish your first digital knowledge product and start earning.</p>
      <Button variant="glow" size="sm" onClick={onPublish} className="mt-2 gap-2 font-bold">
        <PlusCircle className="size-4" /> Publish First Product
      </Button>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((p) => (
        <div key={p.id} className="rounded-xl border border-border bg-surface-1 p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-sm text-foreground line-clamp-2">{p.title}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
              p.status === "published" ? "bg-success/10 text-success" :
              p.status === "draft" ? "bg-warning/10 text-warning" : "bg-muted/10 text-muted"
            }`}>{p.status}</span>
          </div>
          <p className="text-xs text-muted line-clamp-2">{p.summary}</p>
          <div className="flex justify-between text-xs text-muted">
            <span className="font-semibold text-foreground">{p.price_display}</span>
            <span>{p.sales_count} sales</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function MyPurchasesPanel({ purchases }: { purchases: KnowledgePurchase[] }) {
  if (purchases.length === 0) return (
    <div className="text-center py-20 text-muted space-y-2">
      <ShoppingBag className="size-10 mx-auto text-muted/40" />
      <p className="font-semibold">No purchases yet</p>
      <p className="text-sm">Browse the catalog and unlock your first digital resource.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {purchases.map((p) => (
        <div key={p.id} className="rounded-xl border border-border bg-surface-1 p-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-foreground truncate">{p.product.title}</h3>
            <p className="text-xs text-muted mt-0.5">by {p.product.expert_name}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold text-foreground">{p.product.price_display}</p>
            <p className="text-[11px] text-success font-semibold mt-0.5">✓ Unlocked</p>
          </div>
        </div>
      ))}
    </div>
  );
}

