"use client";

import { api } from "@/convex/_generated/api";
import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Runs once per auth session, after Convex has actually picked up the new
 * session token. Calls `claimRole` to:
 *
 *   - On regular login: idempotent backfill — creates a "user" role record
 *     if one doesn't exist (so existing users show up in the staff admin).
 *   - On staff signup: redeems the invite code that the sign-up form
 *     stashed in sessionStorage and promotes the new user to "staff".
 *
 * This component is mounted at the root layout so it fires regardless of
 * which page the user lands on after authenticating.
 */
const PENDING_INVITE_KEY = "pending-staff-invite";

export function AuthEffects() {
  const { isAuthenticated } = useConvexAuth();
  const claimRole = useMutation(api.roles.claimRole);
  // Tracks whether we've already claimed for the *current* auth session.
  const claimedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      // Reset for the next sign-in.
      claimedRef.current = false;
      return;
    }
    if (claimedRef.current) return;
    claimedRef.current = true;

    const inviteCode =
      typeof window !== "undefined"
        ? sessionStorage.getItem(PENDING_INVITE_KEY)
        : null;
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(PENDING_INVITE_KEY);
    }

    claimRole({ inviteCode: inviteCode ?? undefined })
      .then((role) => {
        // Only surface a toast if the user explicitly tried to become staff.
        // Regular-login backfill is silent.
        if (inviteCode) {
          if (role === "staff") {
            toast.success("Staff access granted.");
          } else {
            toast.message("Signed in as a regular user.");
          }
        }
      })
      .catch((err) => {
        // Surface invite-code errors (wrong code, system not configured).
        // Silent failures for plain backfill — login still succeeded.
        if (inviteCode) {
          const message =
            err instanceof Error ? err.message : "Failed to claim role.";
          toast.error(message);
        }
      });
  }, [isAuthenticated, claimRole]);

  return null;
}

// Re-export the key so the sign-up page uses the exact same string.
export const STAFF_INVITE_STORAGE_KEY = PENDING_INVITE_KEY;
