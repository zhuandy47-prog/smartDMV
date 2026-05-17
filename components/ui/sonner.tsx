"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/*
  The app is light-only — no <ThemeProvider> is mounted, so the previous
  `useTheme()` fell back to "system" and Sonner rendered the toast in
  dark mode whenever the user's OS preferred dark. That made the toast
  dark-on-dark over the hero (invisible) and only became readable once
  the user scrolled to a white section.

  Force `theme="light"` so the toast is consistently white-with-dark-
  text everywhere, and use CSS variables that ACTUALLY exist in this
  stylesheet (no `--popover`; we ship `--bg-raised`, `--fg-1`, etc.).
*/
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--bg-raised)",
          "--normal-text": "var(--fg-1)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--r-md)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
