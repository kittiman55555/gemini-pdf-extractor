import { z } from "zod";

// --- I. Zod Schema Generation ---

const YadanaSchema = z.object({
    overall_payment_due_usd: z.number().describe('OVERALL PAYMENT DUE BY PTT TO THE SELLERS (I+II) in USD.'),
    moge_quantity_mmbtu: z.number().describe("MOGE's quantity of gas in MMBTU."),
    pttepi_quantity_mmbtu: z.number().describe("PTTEPI's quantity of gas in MMBTU."),
});
const yadanaSystemPrompt = `You are an expert data extraction model specializing in financial reports based on the Export Gas Sale Agreement (EGSA). Your task is to extract the overall payment amount and the respective MMBTU quantities attributable to the two sellers (MOGE and PTTEPI).

1.  **Strictly adhere to the following Zod schema, which requires a single JSON object.**
2.  **Output ONLY the raw JSON object.** Do not include any extra text, markdown formatting (e.g., \`\`\`json), or explanations.

### Fields to Extract:
* **overall_payment_due_usd**: The grand total payment due from PTT to the Sellers (OVERALL PAYMENT DUE BY PTT TO THE SELLERS) in USD.
* **moge_quantity_mmbtu**: The quantity of gas (MMBTU) attributable to MOGE.
* **pttepi_quantity_mmbtu**: The quantity of gas (MMBTU) attributable to PTTEPI.

### Data Location and Instructions:
* **Source Location**: Locate the summary section near the end of the document, typically on the first page, specifically the total payment and the table titled "SPLIT BETWEEN THE SELLERS".
* **overall_payment_due_usd**: Find the value labeled "OVERALL PAYMENT DUE BY PTT TO THE SELLERS (I+II)" or the large standalone total amount designated "in USD".
* **moge_quantity_mmbtu**: In the table titled "SPLIT BETWEEN THE SELLERS", find the row for **MOGE** and extract the corresponding amount from the **Quantities MMBTU** column.
* **pttepi_quantity_mmbtu**: In the table titled "SPLIT BETWEEN THE SELLERS", find the row for **PTTEPI** and extract the corresponding amount from the **Quantities MMBTU** column.
* **Transformation**: All extracted values must be converted to a JavaScript number type (float/decimal), removing commas.

### Output Format:
Output a single JSON object structured as follows:

Example JSON structure:
{
  "overall_payment_due_usd": 51243920.25, // Extracted dynamically
  "moge_quantity_mmbtu": 3552567, // Extracted dynamically
  "pttepi_quantity_mmbtu": 1642899 // Extracted dynamically
}
`;

const YetagunSummarySchema = z.object({
    sub_total_mmbtu: z.number().default(0).describe('SUB-TOTAL (MMBTU) for quantity to be paid at contract price. Defaults to 0 if not found.'),
    overall_payment_due_usd: z.number().default(0).describe('OVERALL PAYMENT DUE BY PTT TO THE SELLERS in US$. Defaults to 0 if not found.'),
});

const yetagunSystemPrompt = `You are an expert data extraction model specializing in financial reports based on the Yetagun Gas Sales Agreement. Your task is to extract two specific financial totals from the provided document.

1.  **Strictly adhere to the following Zod schema, which requires a single JSON object.**
2.  **Output ONLY the raw JSON object.** Do not include any extra text, markdown formatting (e.g., \`\`\`json), or explanations.

### Fields to Extract:
* **sub_total_mmbtu**: The calculated SUB-TOTAL quantity in MMBTU for Section 2 (Quantity to be paid for at Contract Price).
* **overall_payment_due_usd**: The final total payment due from PTT to the Sellers in US$.

### Data Location and Instructions:
* **Source Location**: Search the document for the main monthly invoice summary table, typically near the top of the first page.
* **sub_total_mmbtu**: Locate the row labeled "**SUB-TOTAL (2.1-2.2+2.3-2.4-2.5)**" and extract the numeric value from the **MMBTU** column. If the value is not found, return **0**.
* **overall_payment_due_usd**: Locate the row/label "**OVERALL PAYMENT DUE BY PTT TO THE SELLERS (US$)**" and extract the corresponding total numeric value. If the value is not found, return **0**.
* **Transformation**: All extracted values must be converted to a JavaScript number type (float/decimal), removing commas.

### Output Format:
Output a single JSON object structured as follows:

Example JSON structure:
{
  "sub_total_mmbtu": 903820.26, // Extracted dynamically, or 0
  "overall_payment_due_usd": 8914559.99 // Extracted dynamically, or 0
}
`;


export type Yadana = z.infer<typeof YadanaSchema>;

export const pttSupplySchemaAndPrompt = {
    yadana: {
        schema: YadanaSchema,
        systemPrompt: yadanaSystemPrompt,
  },
    yetagun: {
        schema: YetagunSummarySchema,
        systemPrompt: yetagunSystemPrompt,
    },
};