import { cn } from "../lib/utils";

export interface CardProps extends React.ComponentProps<"div"> {
  variant?: "default" | "glass" | "glow" | "elevated";
  hover?: boolean;
}

export function Card({
  children,
  className,
  variant = "default",
  hover = false,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl p-6 transition-all duration-200",
        variant === "default" && "border border-border bg-surface shadow-sm",
        variant === "glass" && "glass-panel shadow-glass",
        variant === "glow" && "glass-panel border-glow shadow-glass",
        variant === "elevated" && "border border-border bg-surface shadow-md",
        hover && "hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/40",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
