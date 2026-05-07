import z from "zod";

// Single-field form schema shared by every upload page (bank statement,
// lease agreement, utility bill). Each page just passes its own
// documentType when calling the save mutation.
export const documentSchema = z.object({
  file: z.instanceof(File),
});

// Document types the app accepts. Keep in sync with convex/schema.ts.
export const DOCUMENT_TYPES = [
  "bank_statement",
  "lease_agreement",
  "utility_bill",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

// Human-readable labels for badges, page titles, etc.
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  bank_statement: "Bank Statement",
  lease_agreement: "Lease Agreement",
  utility_bill: "Utility Bill",
};
