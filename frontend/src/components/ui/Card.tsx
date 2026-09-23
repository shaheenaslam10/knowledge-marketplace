import { cn } from "@/lib/utils";

export function Card({ children, className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-surface p-6 shadow-sm", className)}
      {...props}
    >
      {children}
    </div>
  );
}
