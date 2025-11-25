import { z } from "zod";

const totalDemandGulfSchema = z.object({
    gsrc_glng_shipper_total_mmbtu: z.number().describe('ปริมาณก๊าซรวมที่จัดสรรให้กับ GLNG Shipper สำหรับโรงไฟฟ้า GSRC (MMBtu).'),
    gpd_glng_shipper_total_mmbtu: z.number().describe('ปริมาณก๊าซรวมที่จัดสรรให้กับ GLNG Shipper สำหรับโรงไฟฟ้า GPD (MMBtu).'),
    spps_glng_shipper_total_mmbtu: z.number().describe('ปริมาณก๊าซรวมที่จัดสรรให้กับ GLNG Shipper สำหรับโรงไฟฟ้า SPPs ทั้งหมด (MMBtu).'),
});

export type totalDemandGulf = z.infer<typeof totalDemandGulfSchema>;

const totalDemandGulfSystemPrompt = `You are an expert data extraction model. Your task is to extract the total monthly gas allocation (MMBtu) designated for the **GLNG Shipper** from the provided monthly report, categorized by power plant group.

1.  **Strictly adhere to the following Zod schema, which requires a single JSON object.**
2.  **Output ONLY the raw JSON object.** Do not include any extra text, markdown formatting (e.g., \`\`\`json), or explanations.

### Fields to Extract:
* **gsrc_glng_shipper_total_mmbtu**: Total MMBtu allocated to GLNG Shipper for **GSRC Power Plant**.
* **gpd_glng_shipper_total_mmbtu**: Total MMBtu allocated to GLNG Shipper for **GPD Power Plant**.
* **spps_glng_shipper_total_mmbtu**: Total MMBtu allocated to GLNG Shipper for **All SPPs Power Plants**.

### Data Location and Instructions:
The document contains separate summary tables for GSRC, GPD, and SPPs, identifiable by their headings (e.g., "สำหรับโรงไฟฟ้า GSRC", "สำหรับโรงไฟฟ้า GPD", "สำหรับโรงไฟฟ้า SPPs").

* **gsrc_glng_shipper_total_mmbtu**:
    * **Location Hint**: Find the section titled "แบบฟอร์มยืนยันการจัดสรรปริมาณก๊าซรายเดือน สำหรับโรงไฟฟ้า GSRC".
    * **Extraction**: Locate the **Total** row at the bottom of the table and extract the value from the **GLNG Shipper (MMBtu)** column.
* **gpd_glng_shipper_total_mmbtu**:
    * **Location Hint**: Find the section titled "แบบฟอร์มยืนยันการจัดสรรปริมาณก๊าซรายเดือน สำหรับโรงไฟฟ้า GPD".
    * **Extraction**: Locate the **Total** row at the bottom of the table and extract the value from the **GLNG Shipper (MMBtu)** column.
* **spps_glng_shipper_total_mmbtu**:
    * **Location Hint**: Find the section titled "แบบฟอร์มยืนยันการจัดสรรปริมาณก๊าซรายเดือน สำหรับโรงไฟฟ้า SPPs" (or similar phrasing like "ปริมาณก๊าซสำหรับ SPPs").
    * **Extraction**: Locate the **Total** or **Grand Total** row summarizing **GLNG Shipper**'s volume for all SPPs (often near the row containing "408401.00"). Extract this final numeric value (MMBtu).
* **Transformation**: All extracted values must be converted to a JavaScript number type (float/decimal), removing commas.

### Output Format:
Output a single JSON object structured as follows:

Example JSON structure:
{
  "gsrc_glng_shipper_total_mmbtu": 5328612.00, // Extracted dynamically
  "gpd_glng_shipper_total_mmbtu": 4277005.00, // Extracted dynamically
  "spps_glng_shipper_total_mmbtu": 2174849.00 // Extracted dynamically
}
`;

export const pttTotalDemandGulfSchemaAndPrompt = {
    totalDemandGulf: {
        systemPrompt: totalDemandGulfSystemPrompt,
        schema: totalDemandGulfSchema,
    },
};