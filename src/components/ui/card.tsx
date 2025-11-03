"use client";

import clsx from "clsx";

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-neutral-100 bg-white p-4 shadow-card",
        className
      )}
      {...props}
    />
  );
}
