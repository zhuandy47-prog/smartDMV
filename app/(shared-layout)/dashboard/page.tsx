"use client";

import { api } from "@/convex/_generated/api";
import { DOCUMENT_TYPE_LABELS } from "@/app/schemas/documents";
import { StaffGuard } from "@/components/web/StaffGuard";
import {
  FilterPicker,
  type FilterPickerItem,
} from "@/components/ui/list-item";
import { usePaginatedQuery, useQuery } from "convex/react";
import {
  Check,
  CheckCircle2,
  Clock,
  FileText,
  LayoutList,
  Loader2,
  TriangleAlert,
  X,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Filter = "all" | "pending" | "approved" | "rejected";

const PAGE_SIZE = 25;

function StatusChip({ status }: { status?: string }) {
  switch (status) {
    case "approved":
      return (
        <span className="chip chip-ok">
          <Check />
          Approved
        </span>
      );
    case "rejected":
      return (
        <span className="chip chip-err">
          <X />
          Rejected
        </span>
      );
    default:
      return (
        <span className="chip chip-warn">
          <Clock />
          Pending
        </span>
      );
  }
}

function relativeTime(ms: number) {
  const diff = Date.now() - ms;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "yesterday";
  if (day < 7) return `${day} days ago`;
  return new Date(ms).toLocaleDateString();
}

export default function DashboardPage() {
  return (
    <StaffGuard>
      <DashboardInner />
    </StaffGuard>
  );
}

function DashboardInner() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("pending");

  const unreadByStatus = useQuery(api.documents.staffUnreadByStatus);

  const { results, status, loadMore } = usePaginatedQuery(
    api.documents.listAll,
    filter === "all" ? {} : { reviewStatus: filter },
    { initialNumItems: PAGE_SIZE },
  );

  const sorted = [...results].sort((a, b) => {
    const ua = a.unreadCount ?? 0;
    const ub = b.unreadCount ?? 0;
    if (ub !== ua) return ub - ua;
    return a.uploadedAt - b.uploadedAt;
  });

  const flagged = sorted.filter((d) => (d.unreadCount ?? 0) > 0).length;

  // Filter options for the animated FilterPicker. The icon component
  // accepts { size } and renders any lucide / hugeicons / custom icon.
  // Badges come from staffUnreadByStatus and surface as red pills inside
  // each ListItem when its count > 0.
  const filterItems: FilterPickerItem<Filter>[] = [
    {
      key: "pending",
      label: "Pending",
      Icon: ({ size }) => <Clock size={size} />,
      badge: unreadByStatus?.pending,
    },
    {
      key: "approved",
      label: "Approved",
      Icon: ({ size }) => <CheckCircle2 size={size} />,
      badge: unreadByStatus?.approved,
    },
    {
      key: "rejected",
      label: "Rejected",
      Icon: ({ size }) => <XCircle size={size} />,
      badge: unreadByStatus?.rejected,
    },
    {
      key: "all",
      label: "All",
      Icon: ({ size }) => <LayoutList size={size} />,
    },
  ];

  return (
    <div className="view">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Review queue</h1>
            <p className="sub">
              User-submitted documents awaiting staff decision.
            </p>
          </div>
        </div>

        <FilterPicker<Filter>
          items={filterItems}
          selected={filter}
          onChange={setFilter}
        />

        {flagged > 0 && (
          <div className="banner">
            <TriangleAlert />
            <span>
              <b>
                {flagged} document{flagged === 1 ? "" : "s"} have new user
                replies.
              </b>{" "}
              Open each to see the conversation.
            </span>
          </div>
        )}

        {status === "LoadingFirstPage" && (
          <div
            className="table-card"
            style={{
              padding: 48,
              textAlign: "center",
              color: "var(--fg-3)",
            }}
          >
            Loading…
          </div>
        )}

        {sorted.length === 0 && status !== "LoadingFirstPage" && (
          <div
            className="table-card"
            style={{
              padding: 48,
              textAlign: "center",
              color: "var(--fg-3)",
            }}
          >
            No documents{filter !== "all" ? ` with status “${filter}”` : ""}.
          </div>
        )}

        {sorted.length > 0 && (
          <div className="table-card">
            <table className="docs">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Uploaded</th>
                  <th className="right">Action</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((doc) => {
                  const hasUnread =
                    typeof doc.unreadCount === "number" && doc.unreadCount > 0;
                  return (
                    <tr
                      key={doc._id}
                      className={hasUnread ? "unread" : undefined}
                      onClick={() => router.push(`/dashboard/${doc._id}`)}
                    >
                      <td>
                        <div className="docfile">
                          <div className="ico">
                            <FileText />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div
                              className="title"
                              style={{ wordBreak: "break-all" }}
                            >
                              {doc.fileName}
                            </div>
                            <div className="sub">
                              {doc._id.toString().slice(-6).toUpperCase()}
                              {hasUnread && (
                                <span
                                  style={{
                                    marginLeft: 8,
                                    color: "var(--err-500)",
                                    fontWeight: 600,
                                  }}
                                >
                                  • {doc.unreadCount} new
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {doc.documentType
                          ? DOCUMENT_TYPE_LABELS[doc.documentType]
                          : "Other"}
                      </td>
                      <td>
                        <StatusChip status={doc.reviewStatus} />
                      </td>
                      <td className="mono">{relativeTime(doc.uploadedAt)}</td>
                      <td className="right">
                        <span className="btn btn-secondary btn-sm">Review</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {status === "CanLoadMore" && (
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <button
              className="btn btn-secondary"
              onClick={() => loadMore(PAGE_SIZE)}
            >
              Load more
            </button>
          </div>
        )}

        {status === "LoadingMore" && (
          <p
            style={{
              marginTop: 24,
              textAlign: "center",
              color: "var(--fg-3)",
              fontSize: 13,
            }}
          >
            <Loader2 className="size-4 animate-spin" style={{ display: "inline", marginRight: 6 }} />
            Loading more…
          </p>
        )}

        {status === "Exhausted" && sorted.length > 0 && (
          <p
            style={{
              marginTop: 24,
              textAlign: "center",
              color: "var(--fg-4)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: ".08em",
              textTransform: "uppercase",
            }}
          >
            End of list
          </p>
        )}
      </div>
    </div>
  );
}
