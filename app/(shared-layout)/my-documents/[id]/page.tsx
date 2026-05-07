"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { CommentSection } from "@/components/web/CommentSection";
import { DocumentViewer } from "@/components/web/DocumentViewer";
import { useMutation, useQuery } from "convex/react";
import { Check, Clock, Loader2, Upload, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const STATUS_DESCRIPTIONS: Record<string, string> = {
  pending: "Your document is in line for staff review.",
  approved: "Your document was approved. Nothing more to do.",
  rejected:
    "Your document was rejected. See the comments below for the reason and any next steps.",
};

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

export default function MyDocumentDetailPage() {
  const params = useParams<{ id: Id<"documents"> }>();
  const router = useRouter();
  const docId = params.id;

  const document = useQuery(api.documents.getById, { id: docId });
  const fileUrl = useQuery(
    api.documents.getFileUrl,
    document ? { documentId: docId } : "skip",
  );

  const markCommentsSeen = useMutation(api.documents.markCommentsSeen);
  const generateUploadUrl = useMutation(
    api.documents.GenerateDocumentUploadUrl,
  );
  const resubmit = useMutation(api.documents.resubmit);

  const [isResubmitting, setIsResubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mark unread comments as seen on open. Idempotent on the server.
  const seenRef = useRef<string | null>(null);
  useEffect(() => {
    if (!document) return;
    if (seenRef.current === docId) return;
    seenRef.current = docId;
    markCommentsSeen({ documentId: docId }).catch(() => {});
  }, [document, docId, markCommentsSeen]);

  async function handleFilePicked(file: File) {
    setIsResubmitting(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = (await res.json()) as { storageId: string };

      const newId = await resubmit({
        originalDocumentId: docId,
        fileType: file.type,
        storageId,
      });
      toast.success("Resubmitted. Awaiting staff review.");
      router.push(`/my-documents/${newId}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to resubmit.";
      toast.error(message);
    } finally {
      setIsResubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

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
        <p style={{ color: "var(--fg-3)" }}>
          Document not found, or you don&apos;t have access.
        </p>
        <button
          className="btn btn-secondary"
          style={{ marginTop: 16 }}
          onClick={() => router.push("/my-documents")}
        >
          ← Back to My documents
        </button>
      </div>
    );
  }

  const reviewStatus = document.reviewStatus ?? "pending";
  const isRejected = reviewStatus === "rejected";

  return (
    <div className="view">
      <div className="page narrow">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => router.push("/my-documents")}
          style={{ marginBottom: 12 }}
        >
          ‹ Back to My documents
        </button>

        <div className="page-head" style={{ alignItems: "flex-start" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ fontSize: "clamp(32px, 4vw, 44px)", lineHeight: 1.05 }}>
              {document.fileName}
            </h1>
            <p
              className="sub"
              style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
            >
              Uploaded {new Date(document.uploadedAt).toLocaleString()} ·{" "}
              {document.fileType}
            </p>
          </div>
          <StatusChip status={reviewStatus} />
        </div>

        <div className="side-card" style={{ marginBottom: 20 }}>
          <h3>Status</h3>
          <p style={{ fontSize: 14, color: "var(--fg-2)", lineHeight: 1.55 }}>
            {STATUS_DESCRIPTIONS[reviewStatus] ?? STATUS_DESCRIPTIONS.pending}
          </p>
        </div>

        {fileUrl && (
          <div className="side-card" style={{ marginBottom: 20 }}>
            <h3>Document</h3>
            <DocumentViewer
              url={fileUrl}
              fileName={document.fileName}
              fileType={document.fileType}
            />
          </div>
        )}

        {document.analyzed && document.summary && (
          <div className="side-card" style={{ marginBottom: 20 }}>
            <h3>Automated check</h3>
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--fg-1)",
                marginBottom: 6,
              }}
            >
              {document.status?.toUpperCase()} · {document.score}/100
            </p>
            <p style={{ fontSize: 13, color: "var(--fg-3)", lineHeight: 1.55 }}>
              {document.summary}
            </p>
            {document.issues && document.issues.length > 0 && (
              <ul
                style={{
                  marginTop: 12,
                  paddingLeft: 0,
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {document.issues.map((issue) => (
                  <li
                    key={issue}
                    style={{
                      fontSize: 12,
                      color: "var(--err-700)",
                      display: "flex",
                      gap: 8,
                    }}
                  >
                    <span>•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {isRejected && (
          <div className="side-card" style={{ marginBottom: 20 }}>
            <h3>Need to resubmit?</h3>
            <p
              style={{
                fontSize: 13,
                color: "var(--fg-3)",
                marginBottom: 12,
                lineHeight: 1.55,
              }}
            >
              Pick a new file. We&apos;ll save it under{" "}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  background: "var(--ink-1)",
                  padding: "1px 6px",
                  borderRadius: 3,
                }}
              >
                {document.fileName}
              </span>{" "}
              so it stays grouped with this submission.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFilePicked(f);
              }}
              disabled={isResubmitting}
            />
            <button
              className="btn btn-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isResubmitting}
            >
              {isResubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload />
                  Resubmit document
                </>
              )}
            </button>
          </div>
        )}

        <CommentSection postId={docId} />
      </div>
    </div>
  );
}
