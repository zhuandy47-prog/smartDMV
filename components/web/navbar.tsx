"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UserMenu } from "@/components/web/user-menu";
import { StaggerButton } from "../ui/stagger-button";


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
            <StaggerButton staggerDelay={0.03} duration={0.15}>
               Bank statement
            </StaggerButton>
           
          </Link>
          <Link
            href="/lease-agreement"
            className={isActive("/lease-agreement") ? "active" : ""}
          >
            <StaggerButton staggerDelay={0.03} duration={0.15}>
              Lease agreement
            </StaggerButton>
            
          </Link>
          <Link
            href="/utility-bill"
            className={isActive("/utility-bill") ? "active" : ""}
          >
            <StaggerButton staggerDelay={0.03} duration={0.15}>
               Utility bill
            </StaggerButton>
           
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
                <StaggerButton staggerDelay={0.03} duration={0.15}>
              Review queue
            </StaggerButton>
                
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
                <StaggerButton>
              Audit
            </StaggerButton>
                
              </Link>
              <Link
                href="/dashboard/staff"
                className={`staff ${isActive("/dashboard/staff") ? "active" : ""}`}
              >
                <StaggerButton>
              Users
            </StaggerButton>
                
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
            <StaggerButton>
              Sign in
            </StaggerButton>
              
            </Link>
            <Link
              href="/auth/sign-up"
              className="btn btn-sm"
              style={{
                background: "#fff",
                color: "#000",
                borderColor: "#fff",
              }}
            >
              <StaggerButton
                staggerDelay={0.03}
                duration={0.15}
                className="bg-white text-black hover:bg-white"
              >
                Get started
              </StaggerButton>

            </Link>
          </>
        )}
      </div>
    </header>
  );
}
