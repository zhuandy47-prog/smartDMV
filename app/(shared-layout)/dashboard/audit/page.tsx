"use client";

import { api } from "@/convex/_generated/api";
import { StaffGuard } from "@/components/web/StaffGuard";
import { usePaginatedQuery } from "convex/react";
import { Check, Clock, Loader2, X } from "lucide-react";
import Link from "next/link";

const PAGE_SIZE = 50;

export default function AuditLogPage() {
  return (
    <StaffGuard>
      <AuditLogInner />
    </StaffGuard>
  );
}

function AuditLogInner() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.documents.listAuditAll,
    {},
    { initialNumItems: PAGE_SIZE },
  );

  return (
    <div className="view">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Audit log</h1>
            <p className="sub">
              Every approval, rejection, and reopen, in
              reverse-chronological order.
            </p>
          </div>
        </div>

        {status === "LoadingFirstPage" && (
          <div
            className="table-card"
            style={{ padding: 48, textAlign: "center", color: "var(--fg-3)" }}
          >
            Loading…
          </div>
        )}

        {results.length === 0 && status !== "LoadingFirstPage" && (
          <div
            className="table-card"
            style={{ padding: 48, textAlign: "center", color: "var(--fg-3)" }}
          >
            No actions recorded yet.
          </div>
        )}

        {results.length > 0 && (
          <div className="table-card">
            <table className="docs">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>Document</th>
                  <th>By</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {results.map((entry) => (
                  <tr key={entry._id} style={{ cursor: "default" }}>
                    <td className="mono">
                      {new Date(entry._creationTime).toLocaleString()}
                    </td>
                    <td>
                      {entry.action === "approved" ? (
                        <span className="chip chip-ok">
                          <Check />
                          Approved
                        </span>
                      ) : entry.action === "rejected" ? (
                        <span className="chip chip-err">
                          <X />
                          Rejected
                        </span>
                      ) : (
                        <span className="chip chip-warn">
                          <Clock />
                          Reopened
                        </span>
                      )}
                    </td>
                    <td>
                      <Link
                        href={`/dashboard/${entry.documentId}`}
                        style={{
                          color: "var(--seal-500)",
                          textDecoration: "none",
                          fontWeight: 500,
                          wordBreak: "break-all",
                        }}
                      >
                        {entry.documentFileName}
                      </Link>
                    </td>
                    <td>{entry.actorName}</td>
                    <td
                      style={{
                        color: "var(--fg-3)",
                        maxWidth: 320,
                      }}
                    >
                      <span
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          fontStyle: entry.reason ? "italic" : "normal",
                        }}
                      >
                        {entry.reason ?? "—"}
                      </span>
                    </td>
                  </tr>
                ))}
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
            <Loader2
              className="size-4 animate-spin"
              style={{ display: "inline", marginRight: 6 }}
            />
            Loading more…
          </p>
        )}

        {status === "Exhausted" && results.length > 0 && (
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
            End of log
          </p>
        )}
      </div>
    </div>
  );
}
