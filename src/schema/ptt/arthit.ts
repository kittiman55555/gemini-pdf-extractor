import { z } from "zod";

// 1. schema
export const arthitStatementSchema = z.object({
  statement_number: z
    .string()
    .describe(
      'The statement number from the Statement of Account page, e.g., "Statement No. 08-18/2025".'
    ),
  total_sale_volume: z
    .number()
    .describe(
      "The total sale volume in MMBTU from the Statement of Account. Look for 'Total Sale Volume' specifically, NOT 'CTEP Sale Volume'. Example: 9580877.0"
    ),
  total_amount_thb: z
    .number()
    .describe(
      "The Thai Baht amount for the total sale volume from the Statement of Account. Example: 2587457630.82"
    ),
});

// Define the schema for the overall output, including the array of statements and an overall confidence score
export const arthitStatementsExtractionOutputSchema = z.object({
  statements: z
    .array(arthitStatementSchema)
    .describe(
      "An array of all extracted statement details from the Arthit Gas platform Statement of Account page."
    ),
  overall_confidence_score: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "An overall confidence score (0-100) indicating the AI's certainty about the accuracy and completeness of all extracted statements in the array."
    ),
});

export type ArthitStatement = z.infer<typeof arthitStatementSchema>;
export type ArthitStatementsExtractionOutput = z.infer<
  typeof arthitStatementsExtractionOutputSchema
>;

// 2. system prompt

const arthitStatementExtractionSystemPrompt: string = `
You are an expert at extracting structured data from Statement of Account documents related to the Arthit Gas platform operations. Your task is to accurately identify and extract specific details from the provided document text.

**Context:**
- Documents are from the Arthit Gas platform.
- You are specifically looking for the "Statement of Account" page within the document.
- The Statement of Account contains sales volume data in MMBTU and corresponding amounts in Thai Baht (THB).

**Instructions:**
1.  **Locate the Statement of Account page:** Find the page titled "Statement of Account" in the provided document.
2.  **For each Statement of Account, identify the following fields:**
    *   \`statement_number\`: The statement identification number (e.g., "Statement No. 08-18/2025").
    *   \`total_sale_volume\`: The total sale volume in \`MMBTU\`. Look for the field labeled as "Total Sale Volume". **Critical: Use "Total Sale Volume" NOT "CTEP Sale Volume".** Ensure this is parsed as a floating-point number.
    *   \`total_amount_thb\`: The Thai Baht (THB) amount corresponding to the total sale volume. This should be clearly associated with the total sale volume line item. Ensure this is parsed as a floating-point number.
3.  **Overall Confidence Score:** After extracting all statements, generate a single \`overall_confidence_score\` (0-100) for the entire extraction. This score should reflect your certainty that all identified statements have been correctly extracted with accurate values for their respective fields. A score of 100 means absolute certainty about the entire output, while 0 means no certainty.
4.  **Data Types:** Strictly adhere to the specified data types (string for statement_number, number for total_sale_volume and total_amount_thb, number for confidence score). Convert numeric values to floating-point numbers.
5.  **No Summation:** Do not sum quantities or amounts across multiple statements within the individual statement objects.
6.  **Handle Missing Data:** If the Statement of Account page is not found or if required fields are missing, return an empty statements array and provide an appropriate confidence score.
7.  **Output Format:** Provide the extracted data as a single JSON object. This object should contain a \`statements\` array (where each element is a statement object with \`statement_number\`, \`total_sale_volume\`, and \`total_amount_thb\`) and the \`overall_confidence_score\`.
8.  **Accuracy:** Prioritize accuracy in extracting the exact values as they appear in the Statement of Account page.

**Example of desired output structure:**
\`\`\`json
{
  "statements": [
    {
      "statement_number": "Statement No. 08-18/2025",
      "total_sale_volume": 9580877.0,
      "total_amount_thb": 2587457630.82
    }
  ],
  "overall_confidence_score": 96
}
\`\`\`

**Example when Statement of Account is not found:**
\`\`\`json
{
  "statements": [],
  "overall_confidence_score": 0
}
\`\`\`
`;

export const arthitGasPlatformSchemaAndPrompt = {
  statement: {
    schema: arthitStatementsExtractionOutputSchema,
    systemPrompt: arthitStatementExtractionSystemPrompt,
  },
};
