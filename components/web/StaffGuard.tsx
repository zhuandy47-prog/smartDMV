"use client";

import { api } from "@/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { toast } from "sonner";

/**
 * Wraps a page (or section) that should only be visible to staff.
 *
 * - Loading state: render a small placeholder.
 * - Not signed in: redirect to /auth/login.
 * - Signed in but not staff: redirect to / with a toast.
 * - Staff: render children.
 *
 * NOTE: this is *UI gating only*. The real security boundary is the
 * `requireStaff` check inside every staff-only Convex function.
 */
export function StaffGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const role = useQuery(api.roles.myRole, isAuthenticated ? {} : "skip");

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }
    // role === undefined while loading; null means unauthenticated.
    if (role && role !== "staff") {
      toast.error("Staff access required.");
      router.replace("/");
    }
  }, [authLoading, isAuthenticated, role, router]);

  if (authLoading || role === undefined) {
    return (
      <div className="py-12 text-center text-muted-foreground">Loading...</div>
    );
  }
  if (!isAuthenticated || role !== "staff") {
    // Redirect is happening in the effect; render nothing meanwhile.
    return null;
  }
  return <>{children}</>;
}
