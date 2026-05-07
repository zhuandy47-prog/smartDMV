"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Edit01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface InlineEditProps {
  /** Current value to display when not editing. */
  value: string;
  /** Called with the trimmed new value when the user confirms (Enter or check). */
  onSave: (next: string) => void | Promise<void>;
  placeholder?: string;
  ariaLabel?: string;
  /** Disables the pencil button. */
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
}

/**
 * Animated inline-editable single-line text field.
 *
 * - View mode: shows the value with a pen icon at the right.
 * - Click pen → field becomes editable, focus + select-all.
 * - Click checkmark or press Enter → calls onSave(newValue), exits editing.
 * - Press Escape → discards changes, exits editing.
 *
 * Single-line only. Use a textarea for multi-line edits.
 */
export function InlineEdit({
  value,
  onSave,
  placeholder,
  ariaLabel,
  disabled,
  className,
  inputClassName,
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync the external value into our draft only while not editing — so a
  // live update from Convex doesn't yank text out from under the user mid-typing.
  useEffect(() => {
    if (!isEditing) setDraft(value);
  }, [value, isEditing]);

  function startEdit() {
    if (disabled) return;
    setIsEditing(true);
    // Defer focus + select until after the render switches the input to writable.
    setTimeout(() => inputRef.current?.select(), 0);
  }

  async function commit() {
    if (saving) return;
    const next = draft.trim();
    if (next.length === 0 || next === value) {
      // Empty or unchanged → revert without calling onSave.
      setDraft(value);
      setIsEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
      setIsEditing(false);
    } catch {
      // Revert on save failure; the caller already surfaces the toast.
      setDraft(value);
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setDraft(value);
    setIsEditing(false);
  }

  return (
    <motion.div
      layout
      // Subtle outline shadow at rest, removed in editing mode (the focus
      // ring takes over). Earlier versions used `hsl(var(--foreground) / 0.1)`,
      // but `--foreground` in this codebase is a hex color, so that
      // produced invalid CSS and the shadow was silently dropped.
      initial={{ boxShadow: "0 0 0 1px rgb(0 0 0 / 0.04)" }}
      animate={{
        boxShadow: isEditing ? "none" : "0 0 0 1px rgb(0 0 0 / 0.04)",
      }}
      className={cn(
        // Explicit `h-12` makes the pill the same height as the Input
        // inside, so flex centering can't leave a sub-pixel seam where the
        // Input's top edge nearly meets the parent's border.
        "flex items-center relative overflow-hidden h-12 rounded-full border-2 border-input bg-background",
        isEditing &&
          "outline-none ring-2 ring-ring ring-offset-2 ring-offset-background",
        className,
      )}
    >
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        readOnly={!isEditing || saving}
        disabled={saving}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            cancel();
          }
        }}
        // `rounded-none` is critical: the base Input ships `rounded-md`,
        // which renders a 6-px corner inside the parent pill. With
        // `overflow-hidden` and a 60-px outer radius, that mismatched
        // inner corner shows up as a notch in the upper-left of the pill
        // border. Forcing the Input to have no radius eliminates it.
        className={cn(
          "h-full border-0 rounded-none shadow-none focus-visible:ring-0 bg-transparent p-0 text-base w-full min-w-32 pl-5 pr-12",
          isEditing ? "text-foreground" : "text-muted-foreground",
          inputClassName,
        )}
      />
      <AnimatePresence initial={false}>
        {!isEditing ? (
          <motion.span
            key="pen"
            layout="position"
            initial={{ x: 50 }}
            animate={{ x: 0 }}
            exit={{ x: 50 }}
            transition={{ type: "spring", bounce: 0.1 }}
            onClick={startEdit}
            className="absolute right-1 flex items-center justify-center h-10 w-10 rounded-full bg-card/80 border border-[0.2px] hover:bg-card cursor-pointer text-muted-foreground"
            aria-label="Edit"
            role="button"
          >
            <HugeiconsIcon icon={Edit01Icon} size={20} />
          </motion.span>
        ) : (
          <motion.span
            key="check"
            layout="position"
            initial={{ x: 50 }}
            animate={{ x: 0 }}
            exit={{ x: 50 }}
            transition={{ type: "spring", bounce: 0.1 }}
            onClick={commit}
            className="absolute z-20 right-1 flex items-center justify-center h-10 w-10 rounded-full border-[0.2px] bg-primary hover:bg-primary/90 cursor-pointer text-primary-foreground"
            aria-label="Save"
            role="button"
          >
            <HugeiconsIcon icon={Tick02Icon} size={20} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default InlineEdit;
