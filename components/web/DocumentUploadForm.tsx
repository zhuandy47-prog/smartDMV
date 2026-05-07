"use client";

import { type DocumentType } from "@/app/schemas/documents";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import {
  Building2,
  Check,
  FileText,
  Home as HomeIcon,
  Loader2,
  Upload,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

type Step = "idle" | "uploading" | "analyzing" | "done" | "error";

export interface DocumentUploadFormProps {
  documentType: DocumentType;
  /** Optional override; we have sensible defaults per document type below. */
  title?: string;
  subtitle?: string;
}

/**
 * Per-doc-type default copy + checklist that matches the Andy design.
 * The same upload pipeline runs for all three (kept identical to the
 * previous implementation so Convex storage / AI analysis stays untouched).
 */
const PRESETS: Record<
  DocumentType,
  { title: string; subtitle: string; icon: React.ReactNode; checks: string[] }
> = {
  bank_statement: {
    title: "Upload a bank statement",
    subtitle:
      "A recent statement (within 90 days) from your primary checking or savings account.",
    icon: <Building2 />,
    checks: [
      "Account holder name & number visible",
      "Statement period covers a full month",
      "No redactions on transaction lines",
      "Issuing bank logo / header intact",
    ],
  },
  lease_agreement: {
    title: "Upload your lease agreement",
    subtitle:
      "A signed copy of your current residential lease — all pages, including the signature page.",
    icon: <HomeIcon />,
    checks: [
      "All pages included (no missing pages)",
      "Signed by all named parties",
      "Term dates clearly visible",
      "Rent amount + payment terms visible",
    ],
  },
  utility_bill: {
    title: "Upload a utility bill",
    subtitle: "A bill from the past 60 days showing your current address.",
    icon: <Zap />,
    checks: [
      "Service address matches your profile",
      "Issued within the last 60 days",
      "Account holder name visible",
      "Issuing utility / provider visible",
    ],
  },
};

function bytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentUploadForm({
  documentType,
  title,
  subtitle,
}: DocumentUploadFormProps) {
  const preset = PRESETS[documentType];
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(
    api.documents.GenerateDocumentUploadUrl,
  );
  const save = useMutation(api.documents.save);
  const saveAiResult = useMutation(api.documents.saveAiResult);

  const isBusy = step === "uploading" || step === "analyzing";

  function pickFile() {
    if (isBusy) return;
    inputRef.current?.click();
  }

  async function handleSubmit() {
    if (!file) {
      toast.error("Pick a file first.");
      return;
    }
    setError("");
    try {
      // 1. Get a one-time upload URL.
      setStep("uploading");
      const uploadUrl = await generateUploadUrl();

      // 2. Upload bytes.
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Failed to upload file to storage.");
      const { storageId } = (await res.json()) as { storageId: string };

      // 3. Create the document row.
      const id = await save({
        fileName: file.name,
        fileType: file.type,
        storageId,
        documentType,
      });

      // 4. AI pre-verification.
      setStep("analyzing");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", documentType);
      const aiRes = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      const result = (await aiRes.json()) as Partial<{
        score: number;
        status: string;
        summary: string;
        issues: string[];
        error: string;
      }>;

      if (!aiRes.ok || result.error) {
        throw new Error(
          result.error ?? `AI analysis failed (HTTP ${aiRes.status}).`,
        );
      }
      if (
        typeof result.score !== "number" ||
        typeof result.status !== "string" ||
        typeof result.summary !== "string"
      ) {
        throw new Error("AI response was missing required fields.");
      }

      const outcome = await saveAiResult({
        id,
        score: result.score,
        status: result.status,
        summary: result.summary,
        issues: result.issues ?? [],
      });

      setStep("done");
      if (outcome.autoRejected) {
        toast.error(
          `Auto-rejected (score ${outcome.score}/100). See My documents for details.`,
        );
      } else {
        toast.success(
          `Submitted (score ${outcome.score}/100). Awaiting staff review.`,
        );
      }
      router.push(`/my-documents/${id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      setStep("error");
      toast.error(message);
    }
  }

  return (
    <div className="view">
      <div className="page">
        <div className="page-head">
          <div>
            <h1>{title ?? preset.title}</h1>
            <p className="sub">{subtitle ?? preset.subtitle}</p>
          </div>
        </div>

        <div className="upload-row">
          <div>
            <div
              className="dropzone"
              onClick={pickFile}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") pickFile();
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFile(f);
                }}
              />
              <Upload />
              <div className="ttl">
                {file ? "Replace file" : "Drop file or click to browse"}
              </div>
              <div className="sub">
                SmartRent starts reading the moment your file lands.
              </div>
              <div className="formats">PDF · PNG · JPG · up to 25 MB</div>
            </div>

            {file && (
              <div className="uploaded-strip">
                <div className="ico">
                  <FileText size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="name" style={{ wordBreak: "break-all" }}>
                    {file.name}
                  </div>
                  <div className="meta">
                    {bytes(file.size)} ·{" "}
                    {step === "uploading"
                      ? "Uploading…"
                      : step === "analyzing"
                        ? "SmartRent is reading the document…"
                        : step === "done"
                          ? "Done"
                          : step === "error"
                            ? "Failed — try again"
                            : "Ready to submit"}
                  </div>
                </div>
                <div className="progress" aria-hidden>
                  <div
                    style={{
                      width:
                        step === "uploading"
                          ? "55%"
                          : step === "analyzing"
                            ? "85%"
                            : step === "done"
                              ? "100%"
                              : "0%",
                    }}
                  />
                </div>
              </div>
            )}

            {step === "error" && (
              <p
                style={{
                  marginTop: 12,
                  color: "var(--err-700)",
                  fontSize: 13,
                }}
              >
                {error}
              </p>
            )}

            <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={isBusy || !file}
              >
                {isBusy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {step === "uploading" ? "Uploading…" : "Analyzing…"}
                  </>
                ) : (
                  "Submit for review"
                )}
              </button>
              {file && !isBusy && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setFile(null);
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="upload-side">
            <h3>SmartRent will check for</h3>
            <ul>
              {preset.checks.map((c) => (
                <li key={c}>
                  <Check />
                  {c}
                </li>
              ))}
            </ul>
            <div className="fineprint">
              Files are encrypted in transit and at rest. We delete originals
              30 days after verification unless you keep them.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
