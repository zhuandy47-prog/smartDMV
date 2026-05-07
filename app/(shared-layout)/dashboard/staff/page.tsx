"use client";

import { api } from "@/convex/_generated/api";
import { StaffGuard } from "@/components/web/StaffGuard";
import {
  FilterPicker,
  type FilterPickerItem,
} from "@/components/ui/list-item";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowDown,
  ArrowUp,
  LayoutList,
  Loader2,
  Shield,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type RoleFilter = "all" | "user" | "staff";

export default function StaffAdminPage() {
  return (
    <StaffGuard>
      <StaffAdminInner />
    </StaffGuard>
  );
}

function StaffAdminInner() {
  const roles = useQuery(api.roles.listAllRoles);
  const myRole = useQuery(api.roles.myRole);
  const me = useQuery(api.auth.getCurrentUser);
  const setRole = useMutation(api.roles.setRole);

  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<RoleFilter>("all");

  const visible = useMemo(
    () =>
      roles
        ? filter === "all"
          ? roles
          : roles.filter((r) => r.role === filter)
        : undefined,
    [roles, filter],
  );

  // Role filter — no badges (no "unread" concept here, just a category cut).
  const filterItems: FilterPickerItem<RoleFilter>[] = [
    {
      key: "all",
      label: "All",
      Icon: ({ size }) => <LayoutList size={size} />,
    },
    {
      key: "user",
      label: "Users",
      Icon: ({ size }) => <User size={size} />,
    },
    {
      key: "staff",
      label: "Staff",
      Icon: ({ size }) => <Shield size={size} />,
    },
  ];

  async function handleToggle(userId: string, currentRole: "user" | "staff") {
    const next = currentRole === "staff" ? "user" : "staff";
    setPendingUserId(userId);
    try {
      await setRole({ userId, role: next });
      toast.success(
        next === "staff" ? "Promoted to staff." : "Demoted to user.",
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update.";
      toast.error(message);
    } finally {
      setPendingUserId(null);
    }
  }

  return (
    <div className="view">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Users</h1>
            <p className="sub">
              Promote teammates to staff or demote them when their role changes.
            </p>
          </div>
        </div>

        <FilterPicker<RoleFilter>
          items={filterItems}
          selected={filter}
          onChange={setFilter}
        />

        {roles === undefined && (
          <div
            className="table-card"
            style={{ padding: 48, textAlign: "center", color: "var(--fg-3)" }}
          >
            Loading…
          </div>
        )}

        {roles && visible && visible.length === 0 && (
          <div
            className="table-card"
            style={{ padding: 48, textAlign: "center", color: "var(--fg-3)" }}
          >
            No matching users.
          </div>
        )}

        {visible && visible.length > 0 && (
          <div className="table-card">
            <table className="docs">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => {
                  const isMe = me?._id === row.userId;
                  const isPending = pendingUserId === row.userId;
                  const initials = row.name
                    ? row.name
                        .split(" ")
                        .map((p) => p[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    : "—";
                  return (
                    <tr key={row._id} style={{ cursor: "default" }}>
                      <td>
                        <div className="docfile">
                          <div
                            className="ico"
                            style={{
                              borderRadius: "50%",
                              background: "var(--seal-50)",
                              borderColor: "var(--seal-100)",
                              color: "var(--seal-700)",
                              fontSize: 11,
                              fontWeight: 600,
                              fontFamily: "var(--font-mono)",
                              letterSpacing: ".04em",
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="title">{row.name ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="mono">{row.email ?? "—"}</td>
                      <td>
                        <span className={`role-pill ${row.role}`}>
                          {row.role}
                        </span>
                      </td>
                      <td className="right">
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={isPending || isMe}
                          onClick={() => handleToggle(row.userId, row.role)}
                          title={
                            isMe
                              ? "You cannot change your own role"
                              : undefined
                          }
                        >
                          {isPending ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : row.role === "staff" ? (
                            <>
                              <ArrowDown />
                              Demote
                            </>
                          ) : (
                            <>
                              <ArrowUp />
                              Promote
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {myRole === "staff" && (
          <p
            style={{
              fontSize: 12,
              color: "var(--fg-4)",
              marginTop: 16,
              fontFamily: "var(--font-mono)",
              letterSpacing: ".04em",
            }}
          >
            Tip: you cannot demote yourself. Ask another staff member to do it.
          </p>
        )}
      </div>
    </div>
  );
}
