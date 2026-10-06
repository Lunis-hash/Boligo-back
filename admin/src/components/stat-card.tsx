import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  trend,
  variant = "default",
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  trend?: { value: string; up: boolean };
  variant?: "default" | "highlight";
}) {
  return (
    <Card
      className={cn(
        "border-neutral-200/60 shadow-none hover:shadow-sm transition-shadow",
        variant === "highlight" && "border-neutral-300/60 bg-neutral-900 text-white",
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className={cn(
              "text-xs font-medium",
              variant === "highlight" ? "text-neutral-400" : "text-neutral-500",
            )}>
              {title}
            </p>
            <p className={cn(
              "text-2xl font-semibold tracking-tight",
              variant === "highlight" ? "text-white" : "text-neutral-900",
            )}>
              {value}
            </p>
            <div className="flex items-center gap-2">
              {trend && (
                <span className={cn(
                  "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                  trend.up
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-red-50 text-red-500",
                )}>
                  {trend.up ? "↑" : "↓"} {trend.value}
                </span>
              )}
              {hint && (
                <p className={cn(
                  "text-[11px]",
                  variant === "highlight" ? "text-neutral-500" : "text-neutral-400",
                )}>
                  {hint}
                </p>
              )}
            </div>
          </div>
          <span
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              variant === "highlight"
                ? "bg-white/10 text-white"
                : "bg-neutral-100 text-neutral-500",
            )}
          >
            <Icon className="h-4.5 w-4.5" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
