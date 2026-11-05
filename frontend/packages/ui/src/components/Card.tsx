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
        variant === "default" && "border border-border bg-card text-card-foreground shadow-sm",
        variant === "glass" && "glass-panel shadow-glass text-card-foreground",
        variant === "glow" && "glass-panel border-glow shadow-glass text-card-foreground",
        variant === "elevated" && "border border-border bg-card text-card-foreground shadow-md",
        hover && "hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/40",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
