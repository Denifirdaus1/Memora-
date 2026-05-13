import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--primary)] text-[var(--primary-text)] hover:bg-[var(--primary-hover)] focus-visible:outline-[var(--primary)]",
        navy: "bg-[var(--accent-navy)] text-white hover:bg-[#293b52] focus-visible:outline-[var(--accent-navy)]",
        secondary:
          "border border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-[var(--subtle)] focus-visible:outline-[var(--accent-blue)]",
        ghost:
          "text-[var(--foreground)] hover:bg-[var(--subtle)] focus-visible:outline-[var(--accent-blue)]",
        danger:
          "border border-red-200 bg-white text-[var(--danger)] hover:bg-red-50 focus-visible:outline-[var(--danger)]",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-5",
        icon: "h-9 w-9 px-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
