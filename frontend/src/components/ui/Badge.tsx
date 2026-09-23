import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "border-border bg-surface-2 text-muted",
        info: "border-transparent bg-primary-soft text-primary",
        success: "border-transparent bg-success-soft text-success",
        warning: "border-transparent bg-warning-soft text-warning",
        danger: "border-transparent bg-danger-soft text-danger",
        flow: "border-transparent bg-primary-soft text-flow",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

type Tone = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

/** Badges always carry text — never color-only status (WCAG).
 * `tone` is the Phase 2/3 alias for `variant` (kept for existing pages). */
export function Badge({
  className,
  variant,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { tone?: Tone }) {
  return <span className={cn(badgeVariants({ variant: tone ?? variant }), className)} {...props} />;
}
export { badgeVariants };
