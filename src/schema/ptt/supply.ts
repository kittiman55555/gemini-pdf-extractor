import { z } from "zod";

// 1. schema
export const invoiceSchema = z.object({
  invoice_number: z
    .string()
    .describe(
      'The unique invoice number or statement number, e.g., "1631100234" or "OPERATOR\'S STATEMENT NUMBER 41".'
    ),
  quantity: z
    .number()
    .describe(
      "The total quantity in MMBTU for the invoiced item. This may be labeled as 'Total Sale Volume', 'Net Sales (MMBTU)', 'Energy (MMBTU)', or similar. Look for 'Total Sale Volume' specifically, NOT 'CTEP Sale Volume'. Example: 14952366.000 or 23809500.000"
    ),
  amount_before_vat: z
    .number()
    .describe("The total amount in THB before VAT. Example: 2268499702.92"),
});

// Define the schema for the overall output, including the array of invoices and an overall confidence score
export const invoicesExtractionOutputSchema = z.object({
  invoices: z
    .array(invoiceSchema)
    .describe(
      "An array of all extracted invoice details from all gas platforms (G1, G2, G12, Arthit, etc.)."
    ),
  overall_confidence_score: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "An overall confidence score (0-100) indicating the AI's certainty about the accuracy and completeness of *all* extracted invoices in the array."
    ),
});

export type Invoice = z.infer<typeof invoiceSchema>;
export type InvoicesExtractionOutput = z.infer<
  typeof invoicesExtractionOutputSchema
>;

// 2. system prompt

const invoiceExtractionSystemPrompt: string = `
You are an expert at extracting structured data from invoice and operational statement documents related to gas platform operations. Your task is to accurately identify and extract specific details from the provided document text.

**Context:**
- Documents may relate to different gas platforms, including G1, G2, G12, Arthit, or other platforms.
- Each document may contain one or more distinct invoices or statements.
- Terminology varies: quantity in MMBTU may be labeled as "Total Sale Volume", "Net Sales (MMBTU)", "Energy (MMBTU)", "Sales Volume", or similar terms.

**Instructions:**
1.  **Extract all distinct invoices/statements:** Go through the entire document and extract data for every individual invoice or operator's statement present, regardless of which gas platform (G1, G2, G12, Arthit, etc.) it relates to.
2.  **For each individual invoice or statement, identify the following fields:**
    *   \`invoice_number\`: The invoice identification number or statement number (e.g., "1631100234", "OPERATOR'S STATEMENT NUMBER 41", "Statement #42").
    *   \`quantity\`: The total quantity in \`MMBTU\`. Look for fields labeled as "Total Sale Volume", "Net Sales (MMBTU)", "Energy (MMBTU)", "Sales Volume", or similar. **Important: Use "Total Sale Volume" NOT "CTEP Sale Volume" when both are present.** Ensure this is parsed as a floating-point number.
    *   \`amount_before_vat\`: The total amount *before* VAT in \`THB\`. Ensure this is parsed as a floating-point number. If this field is not present in the document, you may skip extracting that invoice.
3.  **Overall Confidence Score:** After extracting all invoices, generate a single \`overall_confidence_score\` (0-100) for the *entire* extraction. This score should reflect your certainty that *all* identified invoices/statements have been correctly extracted with accurate values for their respective fields. A score of 100 means absolute certainty about the entire output, while 0 means no certainty.
4.  **Data Types:** Strictly adhere to the specified data types (string for invoice_number, number for quantity and amount_before_vat, number for confidence score). Convert numeric values to floating-point numbers.
5.  **No Summation:** Do *not* sum quantities or amounts across multiple invoices within the individual invoice objects.
6.  **Handle Missing Data:** If a document contains operational data (like Net Sales MMBTU) but no billing amount in THB, it is likely a pre-invoice operational statement. In such cases, return an empty invoices array and provide an appropriate confidence score with reasoning if possible through the structure.
7.  **Output Format:** Provide the extracted data as a single JSON object. This object should contain an \`invoices\` array (where each element is an invoice object with \`invoice_number\`, \`quantity\`, and \`amount_before_vat\`) and the \`overall_confidence_score\`.
8.  **Accuracy:** Prioritize accuracy in extracting the exact values as they appear in the document.

**Example of desired output structure (if two invoices were found from different platforms):**
\`\`\`json
{
  "invoices": [
    {
      "invoice_number": "STATEMENT_41_G1",
      "quantity": 23809500.000,
      "amount_before_vat": 987654321.01
    },
    {
      "invoice_number": "1631100234",
      "quantity": 14952366.000,
      "amount_before_vat": 2268499702.92
    }
  ],
  "overall_confidence_score": 95
}
\`\`\`

**Example when no billing amount is found (operational statement only):**
\`\`\`json
{
  "invoices": [],
  "overall_confidence_score": 20
}
\`\`\`
`;

export const pttSupplySchemaAndPrompt = {
  invoice: {
    schema: invoicesExtractionOutputSchema,
    systemPrompt: invoiceExtractionSystemPrompt,
  },
};
