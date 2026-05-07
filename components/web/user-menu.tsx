"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { toast } from "sonner";
import {
  FolderIcon,
  LogoutIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Clock01Icon } from "@hugeicons/core-free-icons";

import { authClient } from "@/lib/auth-client";
import { api } from "@/convex/_generated/api";
import SmoothDropdown, {
  type SmoothDropdownEntry,
} from "@/components/ui/smooth-dropdown";

// Mirror of the server-side TTL in convex/account_lifecycle.ts — kept in
// sync by hand. If you change one, change the other.
const ACCOUNT_TTL_DAYS = 60;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Account menu shown in the topnav after sign-in.
 *
 * Replaces the old "Sign out" button + ME/ST avatar pair with a single
 * smooth-dropdown trigger. The collapsed state still shows the initials
 * avatar so users keep their existing visual landmark; opening it reveals:
 *
 *   1. Header — name + email + STAFF/USER badge
 *   2. My documents (with unread comment count if any)
 *   3. Sign out (destructive)
 *
 * The "isStaff" flag is passed in rather than re-queried so the navbar's
 * single roles query stays the source of truth.
 */
export function UserMenu({ isStaff }: { isStaff: boolean }) {
  const router = useRouter();

  // Auth profile (name, email). Cheap query, already cached if other parts
  // of the app subscribe to it.
  const me = useQuery(api.auth.getCurrentUser);

  // Timestamp from which the 60-day deletion clock counts. The backend
  // resolves this to `userSinceAt` (signup or last demotion), falling back
  // to the auth user's createdAt for legacy records, and returns `null`
  // for staff. We don't compute it client-side from `me.createdAt`
  // because that would ignore demotions.
  const accountSince = useQuery(api.roles.myAccountSince);

  // Same unread query the navbar uses; Convex dedupes the subscription so
  // there's no extra cost.
  const unread = useQuery(api.documents.unreadCommentCount);
  const unreadLabel =
    typeof unread === "number" && unread > 0
      ? unread > 9
        ? "9+"
        : String(unread)
      : null;

  const initials = isStaff ? "ST" : "ME";
  const displayName = me?.name?.trim() || (isStaff ? "Staff member" : "Member");
  const email = me?.email ?? "";

  // Days remaining until the account is auto-deleted. Staff never expire.
  // `null` means "don't show the countdown" — either staff, the query
  // is still loading, or the user isn't authenticated.
  const daysRemaining: number | null = (() => {
    if (isStaff) return null;
    if (typeof accountSince !== "number") return null;
    const expiresAt = accountSince + ACCOUNT_TTL_DAYS * MS_PER_DAY;
    // Use ceil so "less than a full day" still reads as 1 day, never 0,
    // until we actually pass the cutoff.
    return Math.ceil((expiresAt - Date.now()) / MS_PER_DAY);
  })();

  // Three-tier color scheme: subtle gray when far away, amber under 14,
  // red under 7 (or already past expiry).
  const countdownTone =
    daysRemaining === null
      ? null
      : daysRemaining <= 7
        ? "danger"
        : daysRemaining <= 14
          ? "warn"
          : "muted";

  const countdownLabel =
    daysRemaining === null
      ? null
      : daysRemaining <= 0
        ? "Account deletes today"
        : daysRemaining === 1
          ? "1 day until account deletion"
          : `${daysRemaining} days until account deletion`;

  const handleSignOut = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          toast.success("Logged out.");
          router.push("/");
        },
        onError: (error) => {
          toast.error(error.error.message);
        },
      },
    });
  };

  const items: SmoothDropdownEntry[] = [
    {
      id: "my-documents",
      label: "My documents",
      icon: FolderIcon,
      onClick: () => router.push("/my-documents"),
      badge: unreadLabel,
    },
    { id: "divider", divider: true },
    {
      id: "sign-out",
      label: "Sign out",
      icon: LogoutIcon,
      destructive: true,
      onClick: handleSignOut,
    },
  ];

  // Trigger: the same circular avatar the navbar used to render, so the
  // upper-right anchor point doesn't visually shift.
  const trigger = (
    <div
      className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--seal-500,_#3b4a8a)] text-white text-[11px] font-semibold tracking-wide select-none"
      aria-label={isStaff ? "Staff account menu" : "Account menu"}
    >
      {initials}
    </div>
  );

  // Header inside the open menu — name + email + role badge, plus an
  // expiry countdown row for non-staff accounts.
  const header = (
    <div>
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--seal-500,_#3b4a8a)] text-white text-[11px] font-semibold tracking-wide shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground truncate">
              {displayName}
            </span>
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase shrink-0 ${
                isStaff
                  ? "bg-[var(--seal-700,_#1f2a5a)] text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isStaff ? "Staff" : "User"}
            </span>
          </div>
          {email && (
            <div className="text-xs text-muted-foreground truncate">{email}</div>
          )}
        </div>
      </div>

      {countdownLabel && (
        <div
          className={`mt-2 flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium ${
            countdownTone === "danger"
              ? "bg-red-50 text-red-700"
              : countdownTone === "warn"
                ? "bg-amber-50 text-amber-700"
                : "bg-muted/60 text-muted-foreground"
          }`}
          aria-live="polite"
        >
          <HugeiconsIcon
            icon={Clock01Icon}
            className="w-3.5 h-3.5 shrink-0"
          />
          <span className="truncate">{countdownLabel}</span>
        </div>
      )}
    </div>
  );

  return (
    <SmoothDropdown
      items={items}
      trigger={trigger}
      header={header}
      openWidth={260}
    />
  );
}
