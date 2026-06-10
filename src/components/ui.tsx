import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* Chubby UI primitives — palette + radii come from globals.css tokens. */

const buttonVariants = {
  primary:
    "bg-marigold text-white hover:bg-marigold-deep active:bg-marigold-deep",
  secondary:
    "bg-peacock text-white hover:bg-peacock-deep active:bg-peacock-deep",
  soft: "bg-marigold-soft text-ink hover:bg-mango-soft",
  ghost: "bg-transparent text-peacock hover:bg-peacock-soft",
  danger: "bg-danger text-white hover:opacity-90",
} as const;

type ButtonVariant = keyof typeof buttonVariants;

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-chubby px-5 min-h-11 font-display font-semibold text-base transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`${buttonBase} ${buttonVariants[variant]} ${className}`}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return (
    <Link
      className={`${buttonBase} ${buttonVariants[variant]} ${className}`}
      {...props}
    />
  );
}

export function Card({
  className = "",
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={`bg-surface rounded-chubby-lg shadow-chubby p-5 ${className}`}
      {...props}
    />
  );
}

export function Chip({
  className = "",
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-chubby bg-pistachio-soft text-ink px-3 py-1 text-sm font-semibold ${className}`}
      {...props}
    />
  );
}

export function Input({
  className = "",
  ...props
}: ComponentProps<"input">) {
  return (
    <input
      className={`w-full rounded-chubby border-2 border-mango bg-surface px-4 min-h-11 text-ink placeholder:text-ink-soft focus:border-marigold focus:outline-none ${className}`}
      {...props}
    />
  );
}

export function Label({
  className = "",
  ...props
}: ComponentProps<"label">) {
  return (
    <label
      className={`block font-semibold text-ink mb-1 ${className}`}
      {...props}
    />
  );
}

export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="font-display text-2xl font-bold text-peacock-deep">
      {children}
    </h1>
  );
}
