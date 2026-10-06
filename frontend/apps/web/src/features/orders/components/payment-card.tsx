"use client";

/** Student payment card — summary, instructions, dev confirm (manual rails),
 * failure/retry and refund states. Amounts come from the server only. */
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PAYMENT_STATUS_COPY, type PaymentInfo } from "@/features/orders/types";

export function PaymentCard({
  payment,
  role,
  busy,
  onPay,
  onConfirm,
}: {
  payment: PaymentInfo;
  role: "student" | "expert";
  busy: boolean;
  onPay: () => Promise<void>;
  onConfirm: () => Promise<void>;
}) {
  const student = role === "student";
  const pending = payment.status === "pending";
  const failed = payment.status === "failed";
  const refunded = payment.status === "refunded" || payment.status === "partially_refunded";

  return (
    <Card>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-muted text-sm font-semibold uppercase tracking-wide">Payment</h2>
          <div className="flex items-center gap-2">
            {payment.simulated && <Badge tone="warning">Simulated (manual gateway)</Badge>}
            <Badge tone={payment.status === "succeeded" ? "success" : failed ? "danger" : pending ? "warning" : "neutral"}>
              {PAYMENT_STATUS_COPY[payment.status]}
            </Badge>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">Order total</dt>
            <dd className="font-medium">
              {payment.currency} {payment.amount_display.toLocaleString()}
            </dd>
          </div>
          {refunded && (
            <div>
              <dt className="text-muted">Refunded</dt>
              <dd className="font-medium">
                {payment.currency} {payment.refunded_display.toLocaleString()}
              </dd>
            </div>
          )}
          {payment.paid_at && (
            <div>
              <dt className="text-muted">Paid at</dt>
              <dd className="font-medium">{new Date(payment.paid_at).toLocaleString()}</dd>
            </div>
          )}
        </dl>

        {failed && payment.failure_reason && (
          <p role="alert" className="text-danger text-sm">
            {payment.failure_reason}
          </p>
        )}

        {student && pending && (
          <div className="border-border space-y-3 border-t pt-3">
            {payment.instructions && <p className="text-muted text-sm">{payment.instructions}</p>}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void onPay()} disabled={busy}>
                {payment.instructions ? "Show payment instructions" : "Start payment"}
              </Button>
              {payment.dev_self_confirm && (
                <Button variant="secondary" onClick={() => void onConfirm()} disabled={busy}>
                  Confirm payment (dev)
                </Button>
              )}
            </div>
            <p className="text-muted text-xs">
              Manual gateway: an operator (or, in local development, the dev confirm action) verifies the
              transfer before the order starts. No card data is collected here.
            </p>
          </div>
        )}

        {student && failed && (
          <Button onClick={() => void onPay()} disabled={busy}>
            Retry payment
          </Button>
        )}
      </div>
    </Card>
  );
}
