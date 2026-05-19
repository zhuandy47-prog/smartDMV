"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { CommentSection } from "@/components/web/CommentSection";
import { DocumentViewer } from "@/components/web/DocumentViewer";
import { StaffGuard } from "@/components/web/StaffGuard";
import { DOCUMENT_TYPE_LABELS } from "@/app/schemas/documents";
import { useMutation, useQuery } from "convex/react";
import {
  Check,
  Clock,
  Loader2,
  RotateCcw,
  TriangleAlert,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

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

export default function DocumentDetailPage() {
  return (
    <StaffGuard>
      <DocumentDetailInner />
    </StaffGuard>
  );
}

function DocumentDetailInner() {
  const params = useParams<{ id: Id<"documents"> }>();
  const router = useRouter();
  const docId = params.id;

  const document = useQuery(api.documents.getById, { id: docId });
  const auditEntries = useQuery(api.documents.listAuditByDocument, {
    documentId: docId,
  });
  const fileUrl = useQuery(
    api.documents.getFileUrl,
    document ? { documentId: docId } : "skip",
  );

  const approve = useMutation(api.documents.approve);
  const rejectWithReason = useMutation(api.documents.rejectWithReason);
  const changeDecision = useMutation(api.documents.changeDecision);
  const markCommentsSeenAsStaff = useMutation(
    api.documents.markCommentsSeenAsStaff,
  );

  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  // Post-decision "Change decision" flow. Tracks which target status the
  // staff member is moving the doc to so we can show the right confirm
  // button + label and call changeDecision with the right newStatus.
  const [changeTarget, setChangeTarget] = useState<
    "approved" | "rejected" | "pending" | null
  >(null);
  const [changeReason, setChangeReason] = useState("");
  const [isChangePending, startChangeTransition] = useTransition();

  const seenRef = useRef<string | null>(null);
  useEffect(() => {
    if (!document) return;
    if (seenRef.current === docId) return;
    seenRef.current = docId;
    markCommentsSeenAsStaff({ documentId: docId }).catch(() => {});
  }, [document, docId, markCommentsSeenAsStaff]);

  if (document === undefined) {
    return (
      <div className="page">
        <p style={{ color: "var(--fg-3)", textAlign: "center", paddingTop: 60 }}>
          Loading…
        </p>
      </div>
    );
  }
  if (document === null) {
    return (
      <div className="page" style={{ textAlign: "center", paddingTop: 80 }}>
        <p style={{ color: "var(--fg-3)" }}>Document not found.</p>
        <button
          className="btn btn-secondary"
          style={{ marginTop: 16 }}
          onClick={() => router.push("/dashboard")}
        >
          ← Back to queue
        </button>
      </div>
    );
  }

  const reviewStatus = document.reviewStatus ?? "pending";
  const isResolved = reviewStatus !== "pending";

  function handleApprove() {
    startTransition(async () => {
      try {
        await approve({ id: docId });
        toast.success("Document approved.");
      } catch {
        toast.error("Failed to approve.");
      }
    });
  }

  function handleReject() {
    if (reason.trim().length === 0) {
      toast.error("Please enter a reason for rejection.");
      return;
    }
    startTransition(async () => {
      try {
        await rejectWithReason({ id: docId, reason });
        toast.success("Document rejected. Reason posted as a comment.");
        setReason("");
        setShowRejectForm(false);
      } catch {
        toast.error("Failed to reject.");
      }
    });
  }

  function cancelChange() {
    setChangeTarget(null);
    setChangeReason("");
  }

  function handleChangeDecision() {
    if (!changeTarget) return;
    if (changeReason.trim().length === 0) {
      toast.error("Please enter a reason for the change.");
      return;
    }
    const target = changeTarget;
    startChangeTransition(async () => {
      try {
        await changeDecision({
          id: docId,
          newStatus: target,
          reason: changeReason,
        });
        const successMsg =
          target === "pending"
            ? "Decision reopened. Document is back in the pending queue."
            : target === "approved"
              ? "Decision changed to approved."
              : "Decision changed to rejected.";
        toast.success(successMsg);
        setChangeReason("");
        setChangeTarget(null);
      } catch {
        toast.error("Failed to change decision.");
      }
    });
  }

  return (
    <div className="view">
      <div className="page">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => router.push("/dashboard")}
          style={{ marginBottom: 12 }}
        >
          ‹ Back to queue
        </button>

        <div className="page-head" style={{ alignItems: "flex-start" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1
              style={{
                fontSize: "clamp(32px, 4vw, 44px)",
                lineHeight: 1.05,
                marginBottom: 12,
              }}
            >
              {document.fileName}
            </h1>
            <p
              className="sub"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                marginTop: 0,
              }}
            >
              {document._id.toString().slice(-6).toUpperCase()} ·{" "}
              {document.documentType
                ? DOCUMENT_TYPE_LABELS[document.documentType]
                : "Other"}{" "}
              · uploaded {new Date(document.uploadedAt).toLocaleString()}
            </p>
          </div>
          <StatusChip status={reviewStatus} />
        </div>

        <div className="review-grid">
          <div className="preview-pane">
            <div className="preview-toolbar">
              <span>Document preview</span>
              <span>{document.fileType}</span>
            </div>
            {fileUrl ? (
              <DocumentViewer
                url={fileUrl}
                fileName={document.fileName}
                fileType={document.fileType}
              />
            ) : (
              <p style={{ color: "var(--fg-3)", fontSize: 13 }}>
                No file attached.
              </p>
            )}
          </div>

          <div className="review-side">
            {document.analyzed && document.summary && (
              <div className="side-card">
                <h3>Automated findings</h3>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color:
                      document.status === "approved"
                        ? "var(--ok-700)"
                        : document.status === "rejected"
                          ? "var(--err-700)"
                          : "var(--warn-700)",
                    marginBottom: 6,
                  }}
                >
                  {document.status?.toUpperCase()} · {document.score}/100
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--fg-3)",
                    lineHeight: 1.55,
                    marginBottom: 12,
                  }}
                >
                  {document.summary}
                </p>
                {document.issues && document.issues.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {document.issues.map((issue) => (
                      <div
                        key={issue}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "16px 1fr",
                          gap: 10,
                        }}
                      >
                        <TriangleAlert
                          style={{
                            width: 14,
                            height: 14,
                            color: "var(--warn-500)",
                            marginTop: 2,
                          }}
                        />
                        <div
                          style={{
                            fontSize: 13,
                            color: "var(--fg-2)",
                            lineHeight: 1.5,
                          }}
                        >
                          {issue}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!isResolved && (
              <div className="side-card">
                <h3>Decision</h3>
                {!showRejectForm ? (
                  <div className="review-actions">
                    <button
                      className="btn btn-success"
                      onClick={handleApprove}
                      disabled={isPending}
                    >
                      {isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <>
                          <Check />
                          Approve
                        </>
                      )}
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => setShowRejectForm(true)}
                      disabled={isPending}
                    >
                      <X />
                      Reject
                    </button>
                  </div>
                ) : (
                  <>
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--fg-3)",
                        marginBottom: 8,
                      }}
                    >
                      Reason — posted to the user as a comment.
                    </p>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Document is blurry, please re-upload."
                    />
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 10,
                      }}
                    >
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={handleReject}
                        disabled={isPending || reason.trim().length === 0}
                      >
                        {isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          "Confirm reject"
                        )}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setShowRejectForm(false);
                          setReason("");
                        }}
                        disabled={isPending}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--fg-4)",
                    marginTop: 12,
                    lineHeight: 1.5,
                  }}
                >
                  The submitter is notified by email. Internal notes stay
                  private.
                </p>
              </div>
            )}

            {isResolved && (
              <div className="side-card">
                <h3>Change decision</h3>
                {!changeTarget ? (
                  <>
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--fg-3)",
                        marginBottom: 10,
                      }}
                    >
                      This document is currently{" "}
                      <strong>{reviewStatus}</strong>. You can override the
                      previous decision below.
                    </p>
                    <div className="review-actions">
                      {reviewStatus !== "approved" && (
                        <button
                          className="btn btn-success"
                          onClick={() => setChangeTarget("approved")}
                          disabled={isChangePending}
                        >
                          <Check />
                          Change to Approved
                        </button>
                      )}
                      {reviewStatus !== "rejected" && (
                        <button
                          className="btn btn-danger"
                          onClick={() => setChangeTarget("rejected")}
                          disabled={isChangePending}
                        >
                          <X />
                          Change to Rejected
                        </button>
                      )}
                      <button
                        className="btn btn-secondary"
                        onClick={() => setChangeTarget("pending")}
                        disabled={isChangePending}
                      >
                        <RotateCcw />
                        Reopen as Pending
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--fg-3)",
                        marginBottom: 8,
                      }}
                    >
                      {changeTarget === "pending"
                        ? "Reopen to pending — explain why this needs re-review."
                        : changeTarget === "approved"
                          ? "Approve this document — explain why the prior decision is being overturned."
                          : "Reject this document — explain why the prior decision is being overturned."}
                    </p>
                    <textarea
                      value={changeReason}
                      onChange={(e) => setChangeReason(e.target.value)}
                      placeholder="Reason for change (required)…"
                    />
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 10,
                      }}
                    >
                      <button
                        className={
                          changeTarget === "approved"
                            ? "btn btn-success btn-sm"
                            : changeTarget === "rejected"
                              ? "btn btn-danger btn-sm"
                              : "btn btn-secondary btn-sm"
                        }
                        onClick={handleChangeDecision}
                        disabled={
                          isChangePending ||
                          changeReason.trim().length === 0
                        }
                      >
                        {isChangePending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : changeTarget === "pending" ? (
                          "Confirm reopen"
                        ) : changeTarget === "approved" ? (
                          "Confirm approve"
                        ) : (
                          "Confirm reject"
                        )}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={cancelChange}
                        disabled={isChangePending}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--fg-4)",
                    marginTop: 12,
                    lineHeight: 1.5,
                  }}
                >
                  Decision changes are recorded in this document’s history
                  with the reason you provide.
                </p>
              </div>
            )}

            {auditEntries && auditEntries.length > 0 && (
              <div className="side-card">
                <h3>History</h3>
                <div className="note-list">
                  {auditEntries.map((entry) => (
                    <div className="note" key={entry._id}>
                      <div className="meta">
                        {entry.action.toUpperCase()} · {entry.actorName} ·{" "}
                        {new Date(entry._creationTime).toLocaleString()}
                      </div>
                      {entry.reason && (
                        <span style={{ fontStyle: "italic" }}>
                          “{entry.reason}”
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 28 }}>
          <CommentSection postId={docId} />
        </div>
      </div>
    </div>
  );
}
