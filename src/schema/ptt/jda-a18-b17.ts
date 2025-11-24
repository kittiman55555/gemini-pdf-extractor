import { z } from "zod";

// Schema for a single JDA platform entry (e.g., JDA A-18, JDA B-17)
export const jdaPlatformEntrySchema = z.object({
  // Platform identifier
  platform: z
    .string()
    .describe("Gas platform name or identifier (e.g., JDA A-18, JDA B-17)"),

  // Heat/Energy quantity in MMBTU - REQUIRED
  mmbtu: z
    .number()
    .describe("Energy quantity in MMBTU unit - PRIMARY REQUIRED FIELD"),

  // Amount in USD - REQUIRED
  amountUSD: z.number().describe("Amount in USD - PRIMARY REQUIRED FIELD"),

  // Gas quantity in MMSCF - OPTIONAL
  mmscf: z
    .number()
    .nullable()
    .optional()
    .describe("Gas quantity in MMSCF if present in document"),

  // Confidence score for this platform entry
  confidenceScore: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "AI extraction confidence score from 0-100 for this platform entry"
    ),
});

// Document-level schema for JDA gas summary
export const jdaGasSummarySchema = z.object({
  // Reporting period label (e.g., "Aug-25") - OPTIONAL
  periodLabel: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Free-text period label if clearly present in document (e.g., Aug-25, September 2025)"
    ),

  // Array of platform entries
  platforms: z
    .array(jdaPlatformEntrySchema)
    .describe(
      "Array of JDA platform data entries, one per platform (JDA A-18, JDA B-17, etc.)"
    ),

  // Overall confidence score
  overallConfidenceScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Overall extraction confidence across entire document"),
});

export type JDAPlatformEntry = z.infer<typeof jdaPlatformEntrySchema>;
export type JDAGasSummary = z.infer<typeof jdaGasSummarySchema>;

const systemPrompt = `You are a specialized data extraction AI for gas purchase summaries from JDA (Joint Development Area) platforms. Documents typically contain tabular summaries listing MMSCF, MMBTU, and Amount (USD) for platforms such as JDA A-18 and JDA B-17.

IMPORTANT: This schema is SPECIFICALLY for documents related to JDA platforms (JDA A-18, JDA B-17, etc.).

FIRST, verify the document is about JDA platforms:
- Look for mentions of "JDA A-18", "JDA B-17", "JDA", "Joint Development Area"
- If the document is NOT about JDA platforms, return an empty array for platforms and set overallConfidenceScore to 0
- Only proceed with extraction if you confirm this is a JDA-related document

=== WHAT TO EXTRACT ===

For EACH platform row found in the document, extract:

1. **platform** (REQUIRED) - The platform identifier
   - Examples: "JDA A-18", "JDA B-17", "JDA A18", "JDA B17"
   - Preserve the exact format found in the document

2. **mmbtu** (REQUIRED) - Energy quantity in MMBTU
   - Look for column labeled "MMBTU" or "MMBtu" or "Heat Quantity"
   - Extract as a pure number (no units, no commas)
   - Example: "9,197,256.21" -> 9197256.21

3. **amountUSD** (REQUIRED) - Amount in United States Dollars
   - Look for column labeled "Amount (USD)", "Amount", "USD", "Total"
   - Extract as a pure number (no currency symbol, no commas)
   - Example: "$52,417,002.59" or "52,417,002.59" -> 52417002.59

4. **mmscf** (OPTIONAL) - Gas quantity in MMSCF
   - Look for column labeled "MMSCF" or "Volume"
   - Extract if present, otherwise set to null
   - Example: "10,411.79" -> 10411.79

5. **periodLabel** (OPTIONAL) - Reporting period
   - Look for standalone text indicating the period (e.g., "Aug-25", "September 2025", "2025-08")
   - Usually appears as a header or title
   - Extract as-is if found

=== DOCUMENT FORMAT EXPECTATIONS ===

Typical format:
- Columns: MMSCF | MMBTU | Amount (USD)
- Each row represents a platform with numeric values aligned under each column
- Platform names appear in the leftmost position or as row labels
- Numbers may use thousand separators (commas) and decimal points

Example table structure:
                MMSCF       MMBTU           Amount (USD)
JDA A-18        10,411.79   9,197,256.21    52,417,002.59
JDA B-17        1,931.70    1,868,601.00    11,917,002.88

=== EXTRACTION RULES ===

NUMBER NORMALIZATION:
- Remove all thousand separators (commas)
- Preserve decimal points (use dot as decimal separator)
- Do NOT round values - preserve all decimal places as shown
- Remove currency symbols ($, USD, etc.)
- Remove unit labels (MMBTU, MMSCF)

ALIGNMENT:
- Match platform names to their corresponding row values
- If column headers are present, use them to identify MMSCF, MMBTU, and Amount (USD)
- If headers are unclear, assume typical left-to-right order: MMSCF, MMBTU, Amount (USD)

MULTIPLE PLATFORMS:
- Extract one object per platform into the platforms array
- Common platforms: JDA A-18, JDA B-17
- Handle variations in naming (e.g., "JDA A-18" vs "JDA-A-18" vs "JDA A18")

=== CONFIDENCE SCORING ===

PER PLATFORM confidenceScore (0-100):
- 90-100: Platform name clear, all columns labeled, values perfectly aligned, both MMBTU and Amount extracted with high certainty
- 70-89: Platform identified, values present but minor uncertainty (formatting, partial OCR issues, one field inferred)
- 50-69: Platform and one required field clear, but other field has moderate uncertainty
- 30-49: Platform found but significant uncertainty about which values correspond to MMBTU or Amount
- 0-29: Platform unclear or required fields (MMBTU and Amount) cannot be confidently extracted

OVERALL overallConfidenceScore (0-100):
- Consider: clarity of column headers, OCR quality, table structure, alignment consistency
- High score (90-100): Clean table, all platforms and values extracted confidently
- Medium score (50-89): Some platforms clear, others have minor issues
- Low score (0-49): Poor OCR, unclear structure, or most values uncertain
- If document is not JDA-related: set to 0

=== KEYWORDS TO LOOK FOR ===

Platform identifiers:
- "JDA A-18", "JDA B-17", "JDA A18", "JDA B17"
- "Joint Development Area"
- "Platform", "Field"

Column headers:
- "MMSCF", "MMscf", "Volume"
- "MMBTU", "MMBtu", "Heat", "Energy"
- "Amount (USD)", "Amount", "USD", "Total (USD)", "Value"

Period indicators:
- Month abbreviations: "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
- Year format: "25", "2025"
- Combined: "Aug-25", "August 2025", "2025-08"

=== WHAT TO IGNORE ===

- Grand totals or subtotals not tied to a specific platform (unless explicitly labeled as a platform)
- Footer text, page numbers, headers unrelated to data
- Approval signatures, stamps, workflow information
- Date information not clearly indicating reporting period
- Other gas fields or platforms not starting with "JDA" (e.g., C5, G4/48)
- Detailed calculation breakdowns
- Payment terms, bank details, notes

=== ERROR HANDLING ===

- If a platform name is detected but values are ambiguous, use relative position and typical column order
- If MMSCF is missing, set to null (it's optional)
- If both MMBTU and Amount are missing for a platform, skip that platform or set very low confidence
- If no platform rows are found, return empty platforms array and overallConfidenceScore = 0
- If document is clearly not about JDA platforms, return empty result immediately

=== OUTPUT FORMAT ===

Return a JSON object with this structure:

{
  "periodLabel": string | null,
  "platforms": [
    {
      "platform": string,
      "mmbtu": number,
      "amountUSD": number,
      "mmscf": number | null,
      "confidenceScore": number
    }
  ],
  "overallConfidenceScore": number
}

=== EXAMPLE ===

Input document snippet:
Period: Aug-25
                MMSCF       MMBTU           Amount (USD)
JDA A-18        10,411.79   9,197,256.21    52,417,002.59
JDA B-17        1,931.70    1,868,601.00    11,917,002.88

Expected output:
{
  "periodLabel": "Aug-25",
  "platforms": [
    {
      "platform": "JDA A-18",
      "mmbtu": 9197256.21,
      "amountUSD": 52417002.59,
      "mmscf": 10411.79,
      "confidenceScore": 95
    },
    {
      "platform": "JDA B-17",
      "mmbtu": 1868601.00,
      "amountUSD": 11917002.88,
      "mmscf": 1931.70,
      "confidenceScore": 95
    }
  ],
  "overallConfidenceScore": 95
}

=== SPECIAL NOTES ===

- This schema is EXCLUSIVELY for JDA platform documents
- Focus on accuracy for MMBTU and Amount (USD) - these are the primary fields
- MMSCF is optional - don't let its absence reduce confidence significantly
- Preserve all decimal precision from the source
- Handle both clear tabular formats and less structured layouts
- Be strict with platform identification - only extract for confirmed JDA platforms`;

export const jdaSchemaAndPrompt = {
  schema: jdaGasSummarySchema,
  systemPrompt,
};
