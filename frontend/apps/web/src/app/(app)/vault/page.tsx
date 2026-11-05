"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FolderOpen,
  BookOpen,
  FileText,
  Receipt,
  Download,
  ExternalLink,
  Printer,
  X,
  CheckCircle2,
  Calendar,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { apiFetch } from "@/lib/api/client";
import { useSession } from "@/features/auth/SessionProvider";

interface VaultPurchase {
  id: number;
  product_title: string;
  product_slug: string;
  product_type: string;
  price_minor: number;
  purchased_at: string;
  download_count: number;
  can_download: boolean;
}

interface VaultDeliverable {
  order_id: number;
  order_title: string;
  expert_name: string;
  delivered_at: string | null;
  status: string;
  scratchpad: string;
}

interface VaultInvoice {
  invoice_number: string;
  order_id: number;
  title: string;
  amount_minor: number;
  currency: string;
  date: string;
  status: string;
  expert_name: string;
}

interface VaultData {
  purchases: VaultPurchase[];
  deliverables: VaultDeliverable[];
  invoices: VaultInvoice[];
}

export default function StudentVaultPage() {
  const { user, status } = useSession();
  const [data, setData] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"products" | "deliverables" | "invoices">("products");
  const [selectedInvoice, setSelectedInvoice] = useState<VaultInvoice | null>(null);
  const [selectedScratchpad, setSelectedScratchpad] = useState<VaultDeliverable | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<VaultData>({ path: "/api/v1/me/vault" })
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          // Graceful fallback with empty structure
          setData({ purchases: [], deliverables: [], invoices: [] });
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading" || loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-2 mb-4" />
        <div className="h-64 animate-pulse rounded-2xl bg-surface-1" />
      </div>
    );
  }

  const purchases = data?.purchases || [];
  const deliverables = data?.deliverables || [];
  const invoices = data?.invoices || [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12 space-y-8" data-testid="student-vault-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
            <FolderOpen className="size-4" />
            <span>Student Knowledge Vault</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            My Digital Assets & Invoices
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Permanent, encrypted access to all unlocked products, coaching deliverables, scratchpads, and tax receipts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/catalog">
            <Button variant="secondary" size="sm" className="text-xs">
              <BookOpen className="size-3.5 mr-1.5" />
              Browse Catalog
            </Button>
          </Link>
          <Link href="/orders">
            <Button variant="glow" size="sm" className="text-xs font-bold shadow-md shadow-primary/20">
              Active Orders
            </Button>
          </Link>
        </div>
      </div>

      {/* Vault Tabs */}
      <div className="flex items-center gap-2 border-b border-border/80">
        <button
          type="button"
          onClick={() => setActiveTab("products")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === "products"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-foreground"
          }`}
          data-testid="tab-vault-products"
        >
          <BookOpen className="size-4" />
          <span>Unlocked Products ({purchases.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("deliverables")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === "deliverables"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-foreground"
          }`}
          data-testid="tab-vault-deliverables"
        >
          <FileText className="size-4" />
          <span>Deliverables & Scratchpads ({deliverables.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("invoices")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === "invoices"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-foreground"
          }`}
          data-testid="tab-vault-invoices"
        >
          <Receipt className="size-4" />
          <span>Official Tax Invoices ({invoices.length})</span>
        </button>
      </div>

      {/* Tab 1: Products */}
      {activeTab === "products" && (
        <div className="space-y-4" data-testid="vault-products-tab-content">
          {purchases.length === 0 ? (
            <Card className="text-center py-16 space-y-3">
              <BookOpen className="size-12 mx-auto text-muted/60" />
              <h3 className="font-bold text-base text-foreground">No digital products unlocked yet</h3>
              <p className="text-xs text-muted max-w-md mx-auto">
                Explore curated study guides, architectural blueprints, and recorded masterclasses in our catalog.
              </p>
              <div className="pt-2">
                <Link href="/catalog">
                  <Button variant="glow" size="sm" className="text-xs font-bold">
                    Explore Catalog
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {purchases.map((item) => (
                <Card
                  key={item.id}
                  className="flex flex-col justify-between hover:border-primary/50 transition-all shadow-sm"
                  data-testid={`vault-item-${item.product_slug}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge tone="info" className="text-[10px] font-bold uppercase">
                        {item.product_type.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-[11px] text-muted flex items-center gap-1">
                        <CheckCircle2 className="size-3 text-emerald-500" />
                        Unlocked
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-foreground">{item.product_title}</h3>
                    <p className="text-[11px] text-muted">
                      Unlocked on {new Date(item.purchased_at).toLocaleDateString()} &middot; ${(item.price_minor / 100).toFixed(2)}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-border flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted">
                      Downloads: {item.download_count}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs font-semibold"
                      onClick={() => alert(`Initiating direct asset download for "${item.product_title}".`)}
                      data-testid={`download-asset-${item.id}`}
                    >
                      <Download className="size-3.5 mr-1 text-primary" />
                      Download
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Deliverables & Scratchpads */}
      {activeTab === "deliverables" && (
        <div className="space-y-4" data-testid="vault-deliverables-tab-content">
          {deliverables.length === 0 ? (
            <Card className="text-center py-16 space-y-3">
              <FileText className="size-12 mx-auto text-muted/60" />
              <h3 className="font-bold text-base text-foreground">No coaching session scratchpads yet</h3>
              <p className="text-xs text-muted max-w-md mx-auto">
                Completed coaching sessions and deliverables automatically synchronize to your vault.
              </p>
              <div className="pt-2">
                <Link href="/experts">
                  <Button variant="glow" size="sm" className="text-xs font-bold">
                    Find a Specialist
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {deliverables.map((deliv) => (
                <Card
                  key={deliv.order_id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-primary/40 transition-all"
                  data-testid={`deliverable-order-${deliv.order_id}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">Order #{deliv.order_id}</span>
                      <Badge tone="success" className="text-[10px] font-bold">
                        {deliv.status.toUpperCase()}
                      </Badge>
                    </div>
                    <h3 className="font-bold text-sm text-foreground">{deliv.order_title}</h3>
                    <p className="text-[11px] text-muted">
                      Mentor: <span className="text-foreground font-medium">{deliv.expert_name}</span> &middot;{" "}
                      {deliv.delivered_at ? `Completed ${new Date(deliv.delivered_at).toLocaleDateString()}` : "Active"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {deliv.scratchpad && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs font-semibold"
                        onClick={() => setSelectedScratchpad(deliv)}
                        data-testid={`view-scratchpad-${deliv.order_id}`}
                      >
                        <Sparkles className="size-3.5 mr-1 text-primary" />
                        View Notes
                      </Button>
                    )}
                    <Link href={`/orders/${deliv.order_id}`}>
                      <Button variant="ghost" size="sm" className="text-xs">
                        Open Workspace <ExternalLink className="size-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Official Invoices */}
      {activeTab === "invoices" && (
        <div className="space-y-4" data-testid="vault-invoices-tab-content">
          {invoices.length === 0 ? (
            <Card className="text-center py-16 space-y-3">
              <Receipt className="size-12 mx-auto text-muted/60" />
              <h3 className="font-bold text-base text-foreground">No invoices generated yet</h3>
              <p className="text-xs text-muted max-w-md mx-auto">
                Itemized tax invoices are generated automatically whenever an order or digital product is purchased.
              </p>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-sm">
              <table className="w-full text-left text-xs" data-testid="invoices-table">
                <thead className="border-b border-border/80 bg-surface-1/70 uppercase tracking-wider text-[10px] font-extrabold text-muted">
                  <tr>
                    <th className="px-4 py-3.5">Invoice #</th>
                    <th className="px-4 py-3.5">Date</th>
                    <th className="px-4 py-3.5">Description</th>
                    <th className="px-4 py-3.5">Specialist</th>
                    <th className="px-4 py-3.5">Total Paid</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {invoices.map((inv) => (
                    <tr key={inv.invoice_number} className="hover:bg-surface-1/40 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-primary">
                        {inv.invoice_number}
                      </td>
                      <td className="px-4 py-3.5 text-muted">
                        {new Date(inv.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-foreground max-w-xs truncate">
                        {inv.title}
                      </td>
                      <td className="px-4 py-3.5 text-muted">{inv.expert_name}</td>
                      <td className="px-4 py-3.5 font-mono font-bold text-foreground">
                        ${(inv.amount_minor / 100).toFixed(2)} {inv.currency}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="size-2.5" />
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-xs h-7 px-2.5 font-semibold"
                          onClick={() => setSelectedInvoice(inv)}
                          data-testid={`view-invoice-${inv.order_id}`}
                        >
                          <Printer className="size-3 mr-1 text-primary" />
                          View Receipt
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Printable Invoice Modal */}
      {selectedInvoice && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setSelectedInvoice(null)}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl text-foreground space-y-6"
            onClick={(e) => e.stopPropagation()}
            data-testid="printable-invoice-modal"
          >
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <Receipt className="size-5 text-primary" />
                <h2 className="font-extrabold text-base">Official Tax Invoice & Receipt</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => window.print()}
                  data-testid="print-invoice-btn"
                >
                  <Printer className="size-3.5 mr-1" />
                  Print / PDF
                </Button>
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="p-1 rounded-md text-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Invoice Printable Sheet */}
            <div className="space-y-5 text-xs">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-extrabold text-lg text-primary">KnowledgeMarketplace Inc.</h3>
                  <p className="text-muted text-[11px]">Vetted Mentorship & Digital Knowledge Platform</p>
                  <p className="text-muted text-[11px]">San Francisco, CA &middot; support@knowledgemarketplace.com</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-extrabold text-sm text-foreground">{selectedInvoice.invoice_number}</span>
                  <p className="text-muted text-[11px] mt-0.5">
                    Date: {new Date(selectedInvoice.date).toLocaleDateString()}
                  </p>
                  <span className="inline-block mt-1 font-bold text-[10px] uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    Paid in Full (Escrow Settled)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-xl border border-border/80 bg-surface-1/50 p-4">
                <div>
                  <p className="font-bold text-[10px] uppercase text-muted tracking-wider">Billed To (Buyer)</p>
                  <p className="font-semibold text-foreground mt-1">{user?.name || "Verified Student"}</p>
                  <p className="text-muted text-[11px]">{user?.email}</p>
                </div>
                <div>
                  <p className="font-bold text-[10px] uppercase text-muted tracking-wider">Service Specialist</p>
                  <p className="font-semibold text-foreground mt-1">{selectedInvoice.expert_name}</p>
                  <p className="text-muted text-[11px]">Approved Subject Mentor</p>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-surface-2 text-[10px] uppercase font-bold text-muted border-b border-border">
                    <tr>
                      <th className="px-3 py-2">Item Description</th>
                      <th className="px-3 py-2 text-right">Rate</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    <tr>
                      <td className="px-3 py-3">
                        <p className="font-bold text-foreground">{selectedInvoice.title}</p>
                        <p className="text-[10px] text-muted">Order reference #{selectedInvoice.order_id}</p>
                      </td>
                      <td className="px-3 py-3 text-right font-mono">
                        ${(selectedInvoice.amount_minor / 100).toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-foreground">
                        ${(selectedInvoice.amount_minor / 100).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="border-t border-border bg-surface-1/70 font-semibold">
                    <tr>
                      <td colSpan={2} className="px-3 py-2 text-right text-muted">Subtotal:</td>
                      <td className="px-3 py-2 text-right font-mono">${(selectedInvoice.amount_minor / 100).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="px-3 py-2 text-right text-muted">Platform Guarantee & Escrow Fee:</td>
                      <td className="px-3 py-2 text-right font-mono">$0.00</td>
                    </tr>
                    <tr className="border-t border-border font-extrabold text-foreground">
                      <td colSpan={2} className="px-3 py-2.5 text-right text-sm">Total Paid ({selectedInvoice.currency}):</td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm text-primary">
                        ${(selectedInvoice.amount_minor / 100).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-muted bg-surface-1/60 p-3 rounded-xl border border-border/80">
                <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
                <span>
                  This receipt confirms double-entry platform settlement. For billing or tax inquiries, reference{" "}
                  <strong className="text-foreground">{selectedInvoice.invoice_number}</strong>.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scratchpad Preview Modal */}
      {selectedScratchpad && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setSelectedScratchpad(null)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl text-foreground space-y-4"
            onClick={(e) => e.stopPropagation()}
            data-testid="scratchpad-modal"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="font-extrabold text-base">Coaching Scratchpad & Session Notes</h2>
                <p className="text-[11px] text-muted">Order #{selectedScratchpad.order_id} &middot; {selectedScratchpad.expert_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedScratchpad(null)}
                className="p-1 rounded-md text-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto rounded-xl border border-border bg-surface-1 p-4 text-xs font-mono whitespace-pre-wrap text-foreground">
              {selectedScratchpad.scratchpad || "No scratchpad notes recorded for this session."}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedScratchpad(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
