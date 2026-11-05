/** Sprint 4: Knowledge Catalog API client. */
import { apiFetch } from "@/lib/api/client";
import type { KnowledgeProduct, KnowledgePurchase } from "./types";

interface CatalogListResponse {
  next: string | null;
  previous: string | null;
  results: KnowledgeProduct[];
}

interface PublishProductPayload {
  title: string;
  summary: string;
  description?: string;
  product_type: string;
  price_minor: number;
  currency?: string;
  subject_id?: number | null;
}

export const catalogApi = {
  /** Public catalog listing with optional FTS search and subject filter. */
  list: (params?: { q?: string; subject?: string; type?: string }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.subject) qs.set("subject", params.subject);
    if (params?.type) qs.set("type", params.type);
    const query = qs.toString();
    return apiFetch<CatalogListResponse>({
      path: `/api/v1/catalog${query ? `?${query}` : ""}`,
    });
  },

  /** Public product detail (adds `already_purchased` flag when authenticated). */
  detail: (slug: string) =>
    apiFetch<KnowledgeProduct>({ path: `/api/v1/catalog/${slug}` }),

  /** Authenticated instant purchase — returns KnowledgePurchase + ledger rows. */
  purchase: (slug: string) =>
    apiFetch<KnowledgePurchase>({
      path: `/api/v1/catalog/${slug}/purchase`,
      method: "POST",
      body: "{}",
      headers: { "Content-Type": "application/json" },
    }),

  /** Buyer's own purchase history. */
  myPurchases: () =>
    apiFetch<KnowledgePurchase[]>({ path: "/api/v1/me/catalog-purchases" }),

  // ---- Specialist publisher studio ----

  /** List the specialist's own products (all statuses). */
  myProducts: () =>
    apiFetch<KnowledgeProduct[]>({ path: "/api/v1/me/expert/products" }),

  /** Publish a new product immediately (status = published). */
  publish: (payload: PublishProductPayload) =>
    apiFetch<KnowledgeProduct>({
      path: "/api/v1/me/expert/products",
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    }),

  /** PATCH update a specialist's own product (including publish a draft). */
  update: (slug: string, payload: Partial<PublishProductPayload> & { publish?: boolean }) =>
    apiFetch<KnowledgeProduct>({
      path: `/api/v1/me/expert/products/${slug}`,
      method: "PATCH",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    }),
};

