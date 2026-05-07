"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { motion } from "motion/react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import useMeasure from "react-use-measure";
import { MoreHorizontalCircle01Icon } from "@hugeicons/core-free-icons";

/**
 * A single selectable row in the dropdown.
 * Pass either `onClick` for a button-style action, or rely on the parent to
 * navigate inside `onClick`. `destructive: true` switches the row to red
 * (e.g. for "Sign out").
 */
export type SmoothDropdownItem = {
  id: string;
  label: string;
  // Pass any icon from "@hugeicons/core-free-icons".
  icon: IconSvgElement;
  onClick?: () => void;
  destructive?: boolean;
  // Small pill rendered after the label, e.g. unread comment count.
  badge?: string | null;
};

export type SmoothDropdownEntry =
  | SmoothDropdownItem
  | { id: string; divider: true };

export interface SmoothDropdownProps {
  /** Items rendered inside the menu, in order. Use `{ id, divider: true }` for separators. */
  items: SmoothDropdownEntry[];
  /** Content shown in the collapsed (40x40) state. Defaults to a 3-dot icon. */
  trigger?: ReactNode;
  /** Optional element rendered above the items (e.g. a name + email block). */
  header?: ReactNode;
  /** Width of the menu when open. Defaults to 240px. */
  openWidth?: number;
  /** Optional className applied to the outer wrapper for positioning. */
  className?: string;
}

const easeOutQuint: [number, number, number, number] = [0.23, 1, 0.32, 1];

/**
 * SmoothDropdown
 *
 * A 40x40 trigger that morphs open into a popover menu using a single layout
 * animation. Items fade/slide in with a subtle stagger; an active/hover row
 * shows a left bar + soft background that spring-animates between rows
 * (shared layoutId).
 *
 * It's intentionally headless about WHAT is in the menu — pass items + an
 * optional header. Used by `UserMenu` for the topnav account dropdown.
 */
export default function SmoothDropdown({
  items,
  trigger,
  header,
  openWidth = 240,
  className,
}: SmoothDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [contentRef, contentBounds] = useMeasure();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const openHeight = Math.max(40, Math.ceil(contentBounds.height));

  return (
    <div
      ref={containerRef}
      className={`relative h-10 w-10 not-prose ${className ?? ""}`}
    >
      <motion.div
        layout
        initial={false}
        animate={{
          width: isOpen ? openWidth : 40,
          height: isOpen ? openHeight : 40,
          borderRadius: isOpen ? 14 : 12,
        }}
        transition={{
          type: "spring" as const,
          damping: 34,
          stiffness: 380,
          mass: 0.8,
        }}
        className="absolute top-0 right-0 bg-popover border border-border shadow-lg overflow-hidden cursor-pointer origin-top-right z-50"
        onClick={() => !isOpen && setIsOpen(true)}
      >
        {/* Collapsed-state trigger — fades out as the menu expands. */}
        <motion.div
          initial={false}
          animate={{
            opacity: isOpen ? 0 : 1,
            scale: isOpen ? 0.8 : 1,
          }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 flex items-center justify-center"
          style={{
            pointerEvents: isOpen ? "none" : "auto",
            willChange: "transform",
          }}
        >
          {trigger ?? (
            <HugeiconsIcon
              icon={MoreHorizontalCircle01Icon}
              className="w-6 h-6 text-muted-foreground"
            />
          )}
        </motion.div>

        {/* Menu content — visible when open. */}
        <div ref={contentRef}>
          <motion.div
            layout
            initial={false}
            animate={{ opacity: isOpen ? 1 : 0 }}
            transition={{ duration: 0.2, delay: isOpen ? 0.08 : 0 }}
            className="p-2"
            style={{
              pointerEvents: isOpen ? "auto" : "none",
              willChange: "transform",
            }}
          >
            {header && (
              <motion.div
                initial={{ opacity: 0, x: 8 }}
                animate={{
                  opacity: isOpen ? 1 : 0,
                  x: isOpen ? 0 : 8,
                }}
                transition={{
                  delay: isOpen ? 0.06 : 0,
                  duration: 0.15,
                  ease: easeOutQuint,
                }}
                className="px-1 pt-1 pb-2"
              >
                {header}
              </motion.div>
            )}

            <ul className="flex flex-col gap-0.5 m-0! p-0! list-none!">
              {items.map((entry, index) => {
                if ("divider" in entry) {
                  return (
                    <motion.hr
                      key={entry.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: isOpen ? 1 : 0 }}
                      transition={{ delay: isOpen ? 0.12 + index * 0.015 : 0 }}
                      className="border-border my-1.5!"
                    />
                  );
                }

                const item = entry;
                const isDestructive = !!item.destructive;
                const showIndicator = hoveredItem === item.id;

                const itemDelay = isOpen ? 0.06 + index * 0.02 : 0;

                return (
                  <motion.li
                    key={item.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{
                      opacity: isOpen ? 1 : 0,
                      x: isOpen ? 0 : 8,
                    }}
                    transition={{
                      delay: itemDelay,
                      duration: 0.15,
                      ease: easeOutQuint,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      item.onClick?.();
                      setIsOpen(false);
                    }}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`relative flex items-center gap-3 rounded-lg text-sm cursor-pointer transition-colors duration-200 ease-out m-0! pl-3! pr-2! py-2! ${
                      isDestructive && showIndicator
                        ? "text-red-600"
                        : isDestructive
                          ? "text-muted-foreground hover:text-red-600"
                          : showIndicator
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {/* Hover background. */}
                    {showIndicator && (
                      <motion.div
                        layoutId="smoothDropdownHover"
                        className={`absolute inset-0 rounded-lg ${
                          isDestructive ? "bg-red-50" : "bg-muted"
                        }`}
                        transition={{
                          type: "spring",
                          damping: 30,
                          stiffness: 520,
                          mass: 0.8,
                        }}
                      />
                    )}
                    {/* Left accent bar. */}
                    {showIndicator && (
                      <motion.div
                        layoutId="smoothDropdownBar"
                        className={`absolute left-0 top-0 bottom-0 my-auto w-[3px] h-5 rounded-full ${
                          isDestructive ? "bg-red-500" : "bg-foreground"
                        }`}
                        transition={{
                          type: "spring",
                          damping: 30,
                          stiffness: 520,
                          mass: 0.8,
                        }}
                      />
                    )}
                    <HugeiconsIcon
                      icon={item.icon}
                      className="w-[18px] h-[18px] relative z-10 shrink-0"
                    />
                    <span className="font-medium relative z-10 flex-1">
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className="relative z-10 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none">
                        {item.badge}
                      </span>
                    )}
                  </motion.li>
                );
              })}
            </ul>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
