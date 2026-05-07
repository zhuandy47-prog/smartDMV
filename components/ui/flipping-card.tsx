import React from "react"

import { cn } from "@/lib/utils"

interface FlippingCardProps {
  className?: string
  /**
   * Applied to BOTH face divs (front and back). The faces hardcode
   * `bg-white text-neutral-950` (and a dark-mode variant), which is the
   * right default for a "card on a light page", but wrong when the card
   * needs to blend into a dark hero background. Pass the override here
   * — `cn()` uses tailwind-merge, so a later `bg-…` / `text-…` cleanly
   * replaces the defaults.
   */
  faceClassName?: string
  height?: number
  width?: number
  frontContent?: React.ReactNode
  backContent?: React.ReactNode
}

export function FlippingCard({
  className,
  faceClassName,
  frontContent,
  backContent,
  height = 300,
  width = 350,
}: FlippingCardProps) {
  return (
    <div
      className="group/flipping-card [perspective:1000px]"
      style={
        {
          "--height": `${height}px`,
          "--width": `${width}px`,
        } as React.CSSProperties
      }
    >
      <div
        className={cn(
          "relative rounded-xl border border-neutral-200 bg-white shadow-lg transition-all duration-700 [transform-style:preserve-3d] group-hover/flipping-card:[transform:rotateY(180deg)] dark:border-neutral-800 dark:bg-neutral-950",
          "h-[var(--height)] w-[var(--width)]",
          className
        )}
      >
        {/* Front Face */}
        <div
          className={cn(
            "absolute inset-0 h-full w-full [transform:rotateY(0deg)] rounded-[inherit] bg-white text-neutral-950 [backface-visibility:hidden] [transform-style:preserve-3d] dark:bg-zinc-950 dark:text-neutral-50",
            faceClassName
          )}
        >
          <div className="h-full w-full [transform:translateZ(70px)_scale(.93)]">
            {frontContent}
          </div>
        </div>
        {/* Back Face */}
        <div
          className={cn(
            "absolute inset-0 h-full w-full [transform:rotateY(180deg)] rounded-[inherit] bg-white text-neutral-950 [backface-visibility:hidden] [transform-style:preserve-3d] dark:bg-zinc-950 dark:text-neutral-50",
            faceClassName
          )}
        >
          <div className="h-full w-full [transform:translateZ(70px)_scale(.93)]">
            {backContent}
          </div>
        </div>
      </div>
    </div>
  )
}
