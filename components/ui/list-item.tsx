"use client";

import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { ReactNode, useEffect, useId, useState } from "react";
import clsx from "clsx";

import { Tick02Icon, FilterHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

/**
 * One option inside a FilterPicker dropdown.
 *
 * - `key` is the unique identifier returned via onChange
 * - `label` is the display text
 * - `Icon` is a render function taking { size } so callers can pass any icon
 *   library (lucide, hugeicons, custom SVG, etc.)
 * - `badge` is an optional unread/notification count for the red pill
 */
export interface FilterPickerItem<T extends string> {
  key: T;
  label: string;
  Icon: (props: { size: number }) => ReactNode;
  badge?: number;
}

interface ListItemProps<T extends string> {
  index: number;
  item: FilterPickerItem<T>;
  selectedKey: T;
  onSelect: (key: T) => void;
}

function ListItem<T extends string>({
  index,
  item,
  selectedKey,
  onSelect,
}: ListItemProps<T>) {
  const delay = (index + 8) * 0.025;
  const isSelected = selectedKey === item.key;
  const showBadge = typeof item.badge === "number" && item.badge > 0;
  const badgeLabel = showBadge
    ? item.badge! > 9
      ? "9+"
      : String(item.badge)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        bounce: 0.1,
        duration: 0.25,
        delay,
        ease: [0.215, 0.61, 0.355, 1],
      }}
      onClick={() => onSelect(item.key)}
      className="px-3 py-2 rounded-2xl flex justify-between items-center cursor-pointer hover:bg-accent text-foreground"
    >
      <div className="flex items-center gap-x-3">
        <span className="text-muted-foreground">
          <item.Icon size={24} />
        </span>
        <span className="capitalize">{item.label}</span>
      </div>
      <div className="flex items-center gap-2">
        {showBadge && (
          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-semibold bg-red-500 text-white">
            {badgeLabel}
          </span>
        )}
        <div
          className={clsx(
            "relative border-border w-6 h-6 overflow-hidden rounded-full",
            isSelected ? "border-none" : "border-[2px]",
          )}
        >
          {isSelected && (
            <div className="absolute inset-0 bg-primary flex justify-center items-center text-primary-foreground">
              <HugeiconsIcon icon={Tick02Icon} size={16} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export interface FilterPickerProps<T extends string> {
  items: FilterPickerItem<T>[];
  selected: T;
  onChange: (key: T) => void;
}

/**
 * Animated filter picker. Click the filter button → a dropdown blooms out
 * showing the items. Pick one → it animates the selection and closes.
 *
 * Replaces traditional tab rows in places where there are 3-7 mutually
 * exclusive choices. Esc closes the dropdown if the user opens it by accident.
 */
export function FilterPicker<T extends string>({
  items,
  selected,
  onChange,
}: FilterPickerProps<T>) {
  const [isOpened, setIsOpened] = useState(false);
  // useId gives a stable unique id per instance — needed because layoutId
  // must be unique within a MotionConfig, otherwise multiple FilterPickers
  // on the same page would morph into each other.
  const wrapperId = `filter-picker-${useId()}`;

  const selectedItem = items.find((i) => i.key === selected) ?? items[0];

  function handleSelect(key: T) {
    onChange(key);
    // Brief delay lets the user see the checkmark land before closing.
    setTimeout(() => setIsOpened(false), 150);
  }

  // Esc key closes the dropdown.
  useEffect(() => {
    if (!isOpened) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpened(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpened]);

  return (
    <section className="flex items-center fill-muted-foreground/70 relative">
      <MotionConfig
        transition={{ type: "spring", duration: 0.85, bounce: 0.35 }}
      >
        {/* Filter button — click to open */}
        <div
          onClick={() => setIsOpened(true)}
          role="button"
          tabIndex={0}
          aria-label="Open filter"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setIsOpened(true);
          }}
          className="relative left-2.5 w-20 h-20 flex justify-center items-center cursor-pointer"
        >
          <HugeiconsIcon
            icon={FilterHorizontalIcon}
            className="text-foreground relative z-10 fill-none"
            size={36}
          />
          <motion.div
            layoutId={wrapperId}
            className="absolute inset-0 z-[2] bg-background border-border"
            style={{ borderRadius: 40, borderWidth: 1 }}
          />
        </div>

        {/* Selected indicator — shows the current option's icon */}
        <motion.div
          initial={{ x: 0 }}
          animate={{ x: isOpened ? -20 : 0 }}
          transition={{ type: "spring", bounce: 0.3, duration: 1.5 }}
          className="relative right-2.5 w-20 h-20 border border-border rounded-full flex justify-center items-center bg-background"
        >
          <span className="text-muted-foreground">
            <selectedItem.Icon size={36} />
          </span>
        </motion.div>

        {/* Dropdown */}
        <AnimatePresence>
          {isOpened && (
            <motion.section
              key="dropdown"
              layoutId={wrapperId}
              className="absolute top-0 left-0 z-20 w-72 px-1 py-1 bg-card border border-border text-base overflow-hidden"
              style={{ borderRadius: 20, borderWidth: 1 }}
            >
              <div className="flex flex-col gap-1">
                {items.map((item, index) => (
                  <ListItem<T>
                    key={item.key}
                    index={index}
                    item={item}
                    selectedKey={selected}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </MotionConfig>
    </section>
  );
}

export default FilterPicker;
