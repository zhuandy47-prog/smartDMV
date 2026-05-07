import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// ---------- Per-type prompts ----------
//
// Each prompt does TWO things the old generic prompt didn't:
//   1) Verifies the document is actually the claimed type (a receipt
//      submitted as a "bank statement" should reject with a clear reason).
//   2) Checks for type-specific REQUIRED FIELDS so missing critical info
//      lowers the score even when the image itself is sharp.
//
// Score buckets are kept consistent across types so AUTO_REJECT_THRESHOLD
// (50) on the Convex side has the same meaning everywhere.

const SHARED_RUBRIC = `
SCORING RUBRIC (apply uniformly):
  - 85-100 "pass":  Correct document type, all required fields clearly visible,
                    image is sharp and complete.
  - 60-84  "warn":  Likely the correct type, but with minor issues (one field
                    hard to read, slightly cropped, mild blur). Staff will
                    still review.
  - 40-59  "reject":Major problems — multiple required fields missing or
                    unreadable, severe blur, or large portions cut off.
  - 0-39   "reject":Wrong document type entirely (e.g., a receipt sent as a
                    bank statement), or completely illegible.

WHEN UNSURE between two buckets, pick the LOWER score so staff has a chance
to review borderline submissions.

In "issues", be specific and actionable (e.g. "Account holder name not
visible", NOT "image quality is poor"). One issue per line item.

If the image is clearly NOT the claimed document type, set status="reject",
score below 30, and the FIRST issue should plainly say what type it actually
appears to be (e.g. "This appears to be a receipt, not a bank statement.").

Return ONLY a JSON object matching the schema. Do not include markdown,
code fences, or any text outside the JSON.
`;

const PROMPTS: Record<string, string> = {
  bank_statement: `
You are verifying a user-submitted BANK STATEMENT for income / identity
verification.

REQUIRED CONTENT (each missing field lowers the score):
  - Bank name or logo
  - Account holder's full name
  - Statement period (start AND end date)
  - Account number (last 4 digits is sufficient — partial redaction is fine)
  - Transaction list or balance information

IMAGE QUALITY:
  - Legible text throughout
  - All four edges visible (not cropped)
  - No glare blocking key fields
  - Even lighting

${SHARED_RUBRIC}
`,

  lease_agreement: `
You are verifying a user-submitted LEASE AGREEMENT (rental contract) for
tenancy verification.

REQUIRED CONTENT (each missing field lowers the score):
  - Tenant name(s)
  - Landlord or property manager name
  - Property address (the rented unit)
  - Lease term — start and end dates, OR a clearly stated month-to-month
  - Monthly rent amount
  - Signatures (at minimum the tenant's; landlord's preferred)

NOTES:
  - Lease agreements are often multi-page. The submitted page should still
    show critical lease details. If only the signature page is shown without
    any of the above, score in the warn range and request the cover page.

IMAGE QUALITY:
  - Legible text throughout
  - All edges visible
  - No glare on key fields

${SHARED_RUBRIC}
`,

  utility_bill: `
You are verifying a user-submitted UTILITY BILL (electricity, water, gas,
internet, phone, etc.) for proof-of-address verification.

REQUIRED CONTENT (each missing field lowers the score):
  - Utility provider name or logo
  - Account holder's full name
  - Service address (the address the utility is billed to)
  - Bill date or billing period
  - Amount due or service details

RECENCY:
  - If a date is visible and the bill is older than ~6 months, mention this
    in "issues" and lower the score into the warn range. Don't reject solely
    for age unless it's egregiously old (e.g., years).

IMAGE QUALITY:
  - Service address and account holder name clearly readable (these are the
    two most critical fields)
  - All edges visible

${SHARED_RUBRIC}
`,
};

// Pin "today" into the prompt at request time. Without this, Gemini's
// training cutoff (somewhere in 2024) makes the model treat any date past
// its cutoff as "in the future" — e.g. it called a bill dated April 2026
// "in the future" while reviewing it on May 6, 2026, and lowered the
// score for being unusable for proof-of-address. Telling the model the
// real date grounds its date math correctly.
function dateContext(): string {
  const now = new Date();
  const iso = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const human = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return `
CURRENT DATE: ${human} (${iso}).
Use this as "today" for all date reasoning. Your training cutoff is
NOT the current date. A document dated on or before today is in the
past; only dates strictly after today are in the future.
`;
}

function buildPrompt(documentType: string | null): string {
  const base =
    documentType && PROMPTS[documentType]
      ? PROMPTS[documentType]
      : // Fallback for legacy uploads with no type — generic image-quality check.
        `
You are verifying a user-submitted document image. Score how usable the
image is for a human reviewer based on legibility, lighting, completeness,
and visible content.

${SHARED_RUBRIC}
`;
  return dateContext() + base;
}

type AnalysisResult = {
  score: number;
  status: "pass" | "warn" | "reject";
  summary: string;
  issues: string[];
};

function isValidResult(value: unknown): value is AnalysisResult {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.score === "number" &&
    (v.status === "pass" || v.status === "warn" || v.status === "reject") &&
    typeof v.summary === "string" &&
    Array.isArray(v.issues) &&
    v.issues.every((x) => typeof x === "string")
  );
}

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const documentType = formData.get("documentType");
    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded." },
        { status: 400 },
      );
    }

    const prompt = buildPrompt(
      typeof documentType === "string" ? documentType : null,
    );

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      // Free-tier eligible. Swap to "gemini-2.0-flash" if you hit a 404
      // on this name from your region — both work for this use case.
      model: "gemini-2.5-flash",
      generationConfig: {
        // responseSchema makes the model emit JSON matching this shape
        // exactly — no markdown fences, no missing fields.
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            score: { type: SchemaType.NUMBER },
            status: {
              type: SchemaType.STRING,
              format: "enum",
              enum: ["pass", "warn", "reject"],
            },
            summary: { type: SchemaType.STRING },
            issues: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
          },
          required: ["score", "status", "summary", "issues"],
        },
      },
    });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: file.type,
          data: base64,
        },
      },
      prompt,
    ]);

    const text = result.response.text();

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error("Gemini returned non-JSON:", text);
      return NextResponse.json(
        { error: "AI response was not valid JSON." },
        { status: 502 },
      );
    }

    if (!isValidResult(parsed)) {
      console.error("Gemini response missing fields:", parsed);
      return NextResponse.json(
        { error: "AI response was missing required fields." },
        { status: 502 },
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("/api/analyze failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
