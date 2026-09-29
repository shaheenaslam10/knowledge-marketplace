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

export function Badge({
  className,
  variant,
  tone,
  pulse = false,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { tone?: Tone; pulse?: boolean }) {
  const chosenTone = tone ?? variant ?? "neutral";
  return (
    <span className={cn(badgeVariants({ variant: chosenTone }), className)} {...props}>
      {pulse && (
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}
export { badgeVariants };
