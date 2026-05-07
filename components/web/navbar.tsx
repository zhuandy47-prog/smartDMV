"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UserMenu } from "@/components/web/user-menu";


export function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useConvexAuth();

  // Returns "user" | "staff" | null. Only fetched when signed in.
  const role = useQuery(api.roles.myRole, isAuthenticated ? {} : "skip");
  const isStaff = role === "staff";

  // Unread staff-comment count for the badge next to "My documents".
  const unread = useQuery(
    api.documents.unreadCommentCount,
    isAuthenticated ? {} : "skip",
  );
  const unreadLabel =
    typeof unread === "number" && unread > 0
      ? unread > 9
        ? "9+"
        : String(unread)
      : null;

  // Unread USER replies on staff's side — drives the pill on "Review queue".
  const staffUnread = useQuery(
    api.documents.staffUnreadCommentCount,
    isStaff ? {} : "skip",
  );
  const staffUnreadLabel =
    typeof staffUnread === "number" && staffUnread > 0
      ? staffUnread > 9
        ? "9+"
        : String(staffUnread)
      : null;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <header className="topnav">
      <Link href="/" className="brand" aria-label="SmartDMV home">
        <span className="brand-mark">
          Smart<span className="accent">DMV</span>
        </span>
      </Link>

      {isAuthenticated && (
        <nav>
          <Link
            href="/bankstatement"
            className={isActive("/bankstatement") ? "active" : ""}
          >
            Bank statement
          </Link>
          <Link
            href="/lease-agreement"
            className={isActive("/lease-agreement") ? "active" : ""}
          >
            Lease agreement
          </Link>
          <Link
            href="/utility-bill"
            className={isActive("/utility-bill") ? "active" : ""}
          >
            Utility bill
          </Link>
        
          {isStaff && (
            <>
              <Link
                href="/dashboard"
                className={`staff ${
                  isActive("/dashboard") &&
                  !isActive("/dashboard/audit") &&
                  !isActive("/dashboard/staff")
                    ? "active"
                    : ""
                }`}
              >
                Review queue
                {staffUnreadLabel && (
                  <span
                    className="nav-pill"
                    aria-label={`${staffUnread} unread user comment${staffUnread === 1 ? "" : "s"}`}
                  >
                    {staffUnreadLabel}
                  </span>
                )}
              </Link>
              <Link
                href="/dashboard/audit"
                className={`staff ${isActive("/dashboard/audit") ? "active" : ""}`}
              >
                Audit
              </Link>
              <Link
                href="/dashboard/staff"
                className={`staff ${isActive("/dashboard/staff") ? "active" : ""}`}
              >
                Users
              </Link>
            </>
          )}
        </nav>
      )}

      <div className="right">
        {isLoading ? null : isAuthenticated ? (
          <UserMenu isStaff={isStaff} />
        ) : (
          <>
            <Link href="/auth/login" className="btn-link">
              Sign in
            </Link>
            <Link
              href="/auth/sign-up"
              className="btn btn-sm"
              style={{
                background: "#fff",
                color: "var(--ink-7)",
                borderColor: "#fff",
              }}
            >
              Get started
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
