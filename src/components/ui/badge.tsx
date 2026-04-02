import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const variantStyles = {
  default: "bg-zinc-700 text-zinc-100",
  success: "bg-green-600/20 text-green-400 border border-green-600/30",
  warning: "bg-yellow-600/20 text-yellow-400 border border-yellow-600/30",
  danger: "bg-red-600/20 text-red-400 border border-red-600/30",
  info: "bg-blue-600/20 text-blue-400 border border-blue-600/30",
} as const;

type BadgeVariant = keyof typeof variantStyles;

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({
  variant = "default",
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
