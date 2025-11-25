import { z } from "zod";

/**
 * Zod Schema for a single gas sale line item within an invoice.
 * Captures quantity and amount before VAT for each item.
 */
const InvoiceLineItemSchema = z.object({
  /**
   * Quantity of gas sold for this line item in MMBTU.
   */
  quantityMMBTU: z
    .number()
    .describe("Quantity of gas sold for this line item in MMBTU."),
  /**
   * Amount for this line item in Thai Baht, excluding VAT.
   */
  amountExcludingVAT: z
    .number()
    .describe("Amount for this line item in Thai Baht, excluding VAT."),
});

/**
 * Zod Schema for a simplified natural gas sales invoice.
 * Focuses on invoice number, line item quantities/amounts, and the total invoice amount before VAT.
 */
const SimplifiedInvoiceSchema = z
  .object({
    /**
     * Unique identifier for the invoice, e.g., '11-29/2025 L'.
     */
    invoiceNumber: z.string().describe("Unique identifier for the invoice."),
    /**
     * An array of line items for this invoice, each with its quantity and amount before VAT.
     */
    lineItems: z
      .array(InvoiceLineItemSchema)
      .min(1)
      .describe(
        "An array of line items for this invoice, each with its quantity and amount before VAT."
      ),
    /**
     * Total amount for this specific invoice in Thai Baht, excluding VAT. This should be the sum of 'amountExcludingVAT' from all 'lineItems'.
     */
    totalInvoiceAmountExcludingVAT: z
      .number()
      .describe(
        "Total amount for this specific invoice in Thai Baht, excluding VAT (sum of lineItems' amountExcludingVAT)."
      ),
  })
  .describe(
    "Simplified schema for a single gas sales invoice, focusing on key financial and quantity data."
  );

/**
 * Top-level Zod Schema for the complete extracted data.
 * Includes an array of simplified invoices and the overall total heat quantity.
 */
export const PdfDataExtractorSchema = z
  .object({
    /**
     * An array of extracted simplified gas sales invoices.
     */
    invoices: z
      .array(SimplifiedInvoiceSchema)
      .min(1)
      .describe("An array of extracted simplified gas sales invoices."),

    /**
     * Overall total heat quantity for the entire document, aggregated from all relevant survey data entries.
     */
    totalHeatQuantity: z
      .object({
        /**
         * The aggregated total heat quantity/energy for the entire document.
         * This value should be the sum of all 'totalEnergyMMBTU' found across all survey reports.
         */
        value: z
          .number()
          .describe(
            "Overall total heat quantity/energy for the entire document."
          ),
        /**
         * Unit of measurement for total heat quantity, which is always MMBTU.
         */
        unit: z
          .literal("MMBTU")
          .describe(
            "Unit of measurement for total heat quantity, which is always MMBTU."
          ),
        /**
         * Confidence score for the overall total heat quantity extraction (0-100%).
         */
        confidence: z
          .number()
          .min(0)
          .max(100)
          .describe(
            "Confidence score for the overall total heat quantity extraction (0-100%)."
          ),
      })
      .describe(
        "Overall total heat quantity for the entire document, aggregated from all survey data."
      ),
  })
  .describe(
    "Extracted summary data from multiple gas sales invoices and associated survey reports for PTT Public Company Limited."
  );

// You can infer the TypeScript types from the Zod schema
export type PdfDataExtractor = z.infer<typeof PdfDataExtractorSchema>;
export type SimplifiedInvoice = z.infer<typeof SimplifiedInvoiceSchema>;
export type InvoiceLineItem = z.infer<typeof InvoiceLineItemSchema>;

export const systemPrompt = `You are a highly specialized data extraction bot designed to extract key financial and quantity data from PDF documents containing natural gas sales invoices and associated survey reports for PTT Public Company Limited.
Your task is to meticulously extract specific information and format it into a JSON object that strictly adheres to the provided Zod schema.

**Instructions:**

1.  **Extract ALL Invoices (Simplified):** Go through the entire document and identify every distinct natural gas sales invoice. Each invoice should be accurately extracted and represented as an object within the \`invoices\` array. **The pages within the PDF may not always be in perfect sequential order for each individual document (invoice or report). Your primary goal is to identify and reconstruct complete logical documents (invoices and survey reports) regardless of their page arrangement.**
    *   For each invoice, extract its unique \`invoiceNumber\`.
    *   Identify all individual **line items** within each invoice. For each line item, extract its \`quantityMMBTU\` (gas quantity in MMBTU) and \`amountExcludingVAT\` (the total amount for that specific line item, before VAT). Represent these as an array of \`lineItems\` for each invoice.
    *   Calculate the \`totalInvoiceAmountExcludingVAT\` for each invoice. This must be the **sum of all \`amountExcludingVAT\` from its \`lineItems\`**.
    *   **Crucially, only extract the \`invoiceNumber\`, \`lineItems\` (with their \`quantityMMBTU\` and \`amountExcludingVAT\`), and the \`totalInvoiceAmountExcludingVAT\` for each invoice.** Do NOT extract other invoice details like vendor name, dates, tax IDs, or bank details.

2.  **Calculate Overall Total Heat Quantity:** Identify all sections related to gas survey data (e.g., MEMORANDUM, Gas Delivery Report). From these reports, extract all instances of total energy in MMBTU (often labeled as 'ปริมาณความร้อน', 'Total Energy', 'Energy').
    *   Calculate the \`totalHeatQuantity.value\` by **summing up all individual total energy (MMBTU) values found across all survey reports** in the document.
    *   The \`totalHeatQuantity.unit\` must be "MMBTU".
    *   Assign a \`totalHeatQuantity.confidence\` score (0-100%) for this overall aggregated value, reflecting the clarity and consistency of the source data.

**Confidence Score Guidelines (0-100%):**

*   **For Individual Invoice Extraction:** Assign a confidence score for the entire invoice's extraction.
    *   **90-100% (Very High)**: Invoice number, all line item quantities/amounts, and the total invoice amount before VAT are perfectly clear, explicitly labeled, and consistently formatted.
    *   **70-89% (High)**: Most invoice details are clear; minor ambiguities in one or two line items. Amounts/quantities can be confidently inferred.
    *   **50-69% (Medium)**: Some line items or the total amount require interpretation, or document quality is moderate. Partial unclarity in critical fields.
    *   **30-49% (Low)**: Significant ambiguity in multiple fields, poor document quality. High uncertainty about extracted values.
    *   **0-29% (Very Low)**: Critical invoice information is missing or highly uncertain.
*   **For Overall Total Heat Quantity Confidence (\`;
totalHeatQuantity.confidence\`):**
    *   **90-100% (Very High)**: All source energy values are clearly labeled (e.g., "Total Energy", "ปริมาณความร้อนรวม"), consistently unitized (MMBTU), and found in official summary tables.
    *   **70-89% (High)**: Energy values found in summary sections; labels are clear but might be abbreviated; units can be inferred from context.
    *   **50-69% (Medium)**: Energy values require some interpretation; found in text rather than tables; units not explicitly stated but inferable.
    *   **30-49% (Low)**: Multiple possible energy values found; unclear if values are total or subtotal; units ambiguous.
    *   **0-29% (Very Low)**: No clear total energy values found, or high uncertainty in aggregation.

**Output Requirements:**

*   Your output **MUST** be a valid JSON object matching the provided Zod schema.
*   All numerical fields must be extracted as **numbers**, without commas, currency symbols, or units. Convert any extracted string numbers to proper numerical types.
*   **NEVER** include VAT amount in any field labeled "ExcludingVAT".
*   **DO NOT** extract any data from the "PTT Invoice Register" pages.
*   **Prioritize absolute accuracy** for all extracted numerical values. Ensure that calculated totals (line item sums for invoice totals, and survey sums for total heat quantity) are precise.
*   Assign **honest confidence scores**; do not inflate scores if there's uncertainty.
`;

export const B8InvoiceAndHeatSchemaAndSystemPrompt = {
  schema: PdfDataExtractorSchema,
  prompt: systemPrompt,
};
