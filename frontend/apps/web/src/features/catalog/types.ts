/** Sprint 4: Knowledge Catalog domain types. */

export type ProductType =
  | "study_guide"
  | "code_template"
  | "recorded_masterclass"
  | "research_pack"
  | "live_cohort";

export type ProductStatus = "draft" | "published" | "archived";

export interface KnowledgeProduct {
  id: number;
  slug: string;
  title: string;
  summary: string;
  description: string;
  product_type: ProductType;
  price_minor: number;
  price_display: string;
  currency: string;
  status: ProductStatus;
  expert_slug: string;
  expert_name: string;
  subject_slug: string | null;
  subject_name: string | null;
  sales_count: number;
  max_seats?: number;
  enrolled_count?: number;
  cohort_scheduled_at?: string | null;
  live_room_code?: string;
  published_at: string | null;
  created_at: string;
  // augmented by detail endpoint when authenticated
  already_purchased?: boolean;
}

export interface KnowledgePurchase {
  id: number;
  product: KnowledgeProduct;
  amount_minor: number;
  currency: string;
  download_count: number;
  created_at: string;
  can_download: boolean;
}

export const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  study_guide: "Study Guide",
  code_template: "Code Template",
  recorded_masterclass: "Recorded Masterclass",
  research_pack: "Research Pack",
  live_cohort: "Live Group Workshop",
};

export const PRODUCT_TYPE_ICON: Record<ProductType, string> = {
  study_guide: "📘",
  code_template: "💻",
  recorded_masterclass: "🎬",
  research_pack: "🔬",
  live_cohort: "👥",
};

