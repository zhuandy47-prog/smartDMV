"use client";

import { api } from "@/convex/_generated/api";
import { DOCUMENT_TYPE_LABELS } from "@/app/schemas/documents";
import {
  FilterPicker,
  type FilterPickerItem,
} from "@/components/ui/list-item";
import { useConvexAuth, useQuery } from "convex/react";
import {
  Check,
  CheckCircle2,
  Clock,
  FileText,
  LayoutList,
  Plus,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

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
          Pending review
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

export default function MyDocumentsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();

  const documents = useQuery(
    api.documents.listMine,
    isAuthenticated ? {} : "skip",
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/auth/login");
  }, [isLoading, isAuthenticated, router]);

  const [tab, setTab] = useState<StatusFilter>("all");

  // Per-status unread totals — drive the red pills inside the FilterPicker.
  // Sums each doc's unreadCount within the matching reviewStatus bucket.
  const unreadByStatus = (() => {
    const acc = { pending: 0, approved: 0, rejected: 0 };
    if (!documents) return acc;
    for (const d of documents) {
      const s = (d.reviewStatus ?? "pending") as keyof typeof acc;
      if (s in acc) acc[s] += d.unreadCount ?? 0;
    }
    return acc;
  })();

  const filterItems: FilterPickerItem<StatusFilter>[] = [
    {
      key: "all",
      label: "All",
      Icon: ({ size }) => <LayoutList size={size} />,
    },
    {
      key: "pending",
      label: "Pending",
      Icon: ({ size }) => <Clock size={size} />,
      badge: unreadByStatus.pending,
    },
    {
      key: "approved",
      label: "Approved",
      Icon: ({ size }) => <CheckCircle2 size={size} />,
      badge: unreadByStatus.approved,
    },
    {
      key: "rejected",
      label: "Rejected",
      Icon: ({ size }) => <XCircle size={size} />,
      badge: unreadByStatus.rejected,
    },
  ];

  const sorted = documents
    ? [...documents].sort((a, b) => {
        // unread first, then newest upload
        const ua = a.unreadCount ?? 0;
        const ub = b.unreadCount ?? 0;
        if (ub !== ua) return ub - ua;
        return b.uploadedAt - a.uploadedAt;
      })
    : undefined;

  const filtered =
    sorted &&
    (tab === "all"
      ? sorted
      : sorted.filter((d) => (d.reviewStatus ?? "pending") === tab));

  return (
    <div className="view">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>My documents</h1>
            <p className="sub">
              Everything you&apos;ve submitted for verification.
            </p>
          </div>
          <Link href="/bankstatement" className="btn btn-primary">
            <Plus />
            Upload new
          </Link>
        </div>

        <FilterPicker<StatusFilter>
          items={filterItems}
          selected={tab}
          onChange={setTab}
        />

        {sorted === undefined && (
          <div className="table-card" style={{ padding: 48, textAlign: "center", color: "var(--fg-3)" }}>
            Loading…
          </div>
        )}

        {sorted && filtered && filtered.length === 0 && (
          <div
            className="table-card"
            style={{ padding: 48, textAlign: "center", color: "var(--fg-3)" }}
          >
            <p style={{ marginBottom: 14 }}>
              {tab === "all"
                ? "You haven't submitted any documents yet."
                : `No ${tab} documents.`}
            </p>
            {tab === "all" && (
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <Link href="/bankstatement" className="btn-link sm">
                  Bank statement
                </Link>
                <Link href="/lease-agreement" className="btn-link sm">
                  Lease agreement
                </Link>
                <Link href="/utility-bill" className="btn-link sm">
                  Utility bill
                </Link>
              </div>
            )}
          </div>
        )}

        {filtered && filtered.length > 0 && (
          <div className="table-card">
            <table className="docs">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Type</th>
                  <th>Uploaded</th>
                  <th>Status</th>
                  <th className="right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => {
                  const hasUnread =
                    typeof doc.unreadCount === "number" && doc.unreadCount > 0;
                  return (
                    <tr
                      key={doc._id}
                      className={hasUnread ? "unread" : undefined}
                      onClick={() => router.push(`/my-documents/${doc._id}`)}
                    >
                      <td>
                        <div className="docfile">
                          <div className="ico">
                            <FileText />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div className="title" style={{ wordBreak: "break-all" }}>
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
                      <td className="mono">{relativeTime(doc.uploadedAt)}</td>
                      <td>
                        <StatusChip status={doc.reviewStatus} />
                      </td>
                      <td className="right">
                        {doc.reviewStatus === "rejected" ? (
                          <span
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link
                              href={`/my-documents/${doc._id}`}
                              style={{ color: "inherit", textDecoration: "none" }}
                            >
                              Re-upload
                            </Link>
                          </span>
                        ) : (
                          <span className="btn btn-ghost btn-sm">View</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

