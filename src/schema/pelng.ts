import { z } from "zod";

export const PELNG_EXTRACTION_SYSTEM_PROMPT = `
You are an expert financial-document extraction AI specialized in Thai/English LNG terminal and EGAT invoices.
Return ONLY a valid JSON object that matches the provided schema. No extra keys, comments, or text.

DOCUMENT LANGUAGE: Thai and/or English
CURRENCY: THB unless specified otherwise

CORE RULES
1) Numbers:
   - Output pure numeric values (no commas, spaces, currency symbols).
   - Convert Thai numerals to Arabic numerals.
   - Preserve decimal points.
   - For required fields: If a value cannot be found, use 0.

2) Units:
   - Quantities must match the unit requested by the schema:
     • For gas quantities use MMBTU (Million BTU / ล้านBTU).
   - Unit prices should be in THB per MMBTU (THB/MMBTU) unless clearly specified otherwise.

3) Field Matching Strategy:
   - Use the synonyms below to find each field reliably.
   - Prefer totals and summary sections when labels indicate combined or final amounts.
   - If the same label appears multiple times, choose the one most clearly labeled and closest to the relevant header or in the summary box.

4) Thai/English Terminology Hints (Synonyms and Variants):

   Station Service Fee (ค่าบริการสถานี):
   - TH: ค่าบริการสถานี, รวมจำนวนเงินค่าบริการส่วนต้นทุนคงที่กับค่าบริการต้นทุนผันแปร, รวมค่าบริการสถานี
   - EN: Station Service Fee, Terminal Service Fee, Sum of Fixed + Variable Service Fees

   Fixed-Cost Service (ค่าบริการส่วนต้นทุนคงที่):
   - TH labels (for each column):
     • ปริมาณ, จำนวน, ปริมาณก๊าซ (MMBTU/ล้านBTU)
     • ราคาต่อหน่วย, ราคาหน่วยละ (บาท/MMBTU)
     • จำนวนเงิน, มูลค่า, มูลค่าค่าบริการ (บาท)
   - EN: Fixed Cost Service - Quantity (MMBTU), Unit Price (THB/MMBTU), Amount (THB)

   Variable-Cost Service (ค่าบริการส่วนต้นทุนผันแปร):
   - TH labels (for each column):
     • ปริมาณ, จำนวน, ปริมาณก๊าซ (MMBTU/ล้านBTU)
     • ราคาต่อหน่วย, ราคาหน่วยละ (บาท/MMBTU)
     • จำนวนเงิน, มูลค่า, มูลค่าค่าบริการ (บาท)
   - EN: Variable Cost Service - Quantity (MMBTU), Unit Price (THB/MMBTU), Amount (THB)

   Total Amount before Tax [NOT Grand Total] (มูลค่ารวม ก่อนคิด Tax):
   - TH: มูลค่ารวม, ยอดรวมทั้งสิ้น, จำนวนเงินรวม, ยอดชำระ
   - EN: Grand Total, Total Amount, Amount Due

   RLNG Total Value (มูลค่า RLNG รวม):
   - TH: มูลค่า RLNG รวม, มูลค่ารวม RLNG, มูลค่า RLNG
   - EN: RLNG Total Value, Total RLNG Amount, RLNG Value

5) Context Awareness:
   - In tables, map columns like: Description | Quantity | Unit | Unit Price | Amount.
   - Totals often appear at the bottom/right or in a summary box.
   - If both before-VAT and after-VAT totals exist, pick the label that explicitly matches the schema name; otherwise select the document's main total.

6) Quality Checks (internal):
   - All money fields must be non-negative THB numbers.
   - Quantities must be non-negative and in MMBTU.
   - Unit prices must be THB per MMBTU (THB/MMBTU).

7) Output:
   - Return ONLY a JSON object matching the schema keys EXACTLY.
   - Do not add fields not present in the schema.
   
   - If a field is truly missing and optional, return null. For required fields, provide the best-supported value.

8. **fixed_cost_ld_phase_1_5_mtpa_mmbtu (NESTED OBJECT)** - Extract the description (desc) and MMBTU quantity (mmbtu) for the Fixed-Cost Service item relevant to the 'Ld Phase-1 5 MTPA' context.
   - **desc**:
     • Extract ONLY the actual service description text.
     • REMOVE project-context labels such as "Phase-1 5 MTPA", "Phase 1", "5 MTPA", or similar variants.
     • REMOVE surrounding parentheses for date ranges (เช่น "(วันที่ 1-31 สิงหาคม 2568)") 
       and convert them to a clean date suffix.
     • Final format MUST be:
         ค่าบริการส่วนต้นทุนคงที่ (Ld) <date-range>

     Example output:
         "ค่าบริการส่วนต้นทุนคงที่ (Ld) 1-31 สิงหาคม 2568"
         
  - **mmbtu**: Find the Quantity (ปริมาณ) corresponding to the fixed cost service line item, and output as a number.

9. **fixed_cost_ld_phase_1_5_mtpa_price_per_unit (NESTED OBJECT)** - Extract the description (desc) and MMBTU quantity (mmbtu) for the Fixed-Cost Service item relevant to the 'Ld Phase-1 5 MTPA' context.
   - **desc**:
     • Extract ONLY the actual service description text.
     • REMOVE project-context labels such as "Phase-1 5 MTPA", "Phase 1", "5 MTPA", or similar variants.
     • REMOVE surrounding parentheses for date ranges (เช่น "(วันที่ 1-31 สิงหาคม 2568)") 
       and convert them to a clean date suffix.
     • Final format MUST be:
         ค่าบริการส่วนต้นทุนคงที่ (Ld) <date-range>

     Example output:
         "ค่าบริการส่วนต้นทุนคงที่ (Ld) 1-31 สิงหาคม 2568"

10. **lmpt2_station_service_fees_total_baht (NESTED OBJECT)** - Extract the total amount and description corresponding to the overall Station Service Fees total (which may be labeled "Total Amount" or "รวมจำนวนเงิน").
    - **description**: 
      • Extract ONLY the actual label text used for the total amount.
      • Final format MUST be: "รวมจำนวนเงิน" or "Total Amount" (select the primary label found).
    - **amount_baht**:
      • Find the final numeric value (THB) corresponding to the "Total Amount" line, before VAT or final tax is applied (if available).

11. For all optional fields:
      - If the value is not explicitly present in the visible text, return null.
      - Do NOT infer, estimate, or guess missing values.

12. Section Boundary (DO NOT CROSS-SECTIONS OR PAGES):
   - For all fields that belong to a specific MTPA block (such as 0.5 MTPA, 1 MTPA, 5 MTPA, Phase-1 5 MTPA, etc.):
     • Extract values ONLY from the same table section or page where that MTPA header appears.
     • Do NOT search in other pages, other sections, or other MTPA blocks.

   - If a Fixed-Cost (Ld) or Variable-Cost (Lc) line item does NOT exist inside that exact section:
       → Return null for all related fields.

   - Absolutely DO NOT infer or guess values from:
       • Other MTPA blocks
       • Summary pages
       • Previous or next document pages
       • Similar labels elsewhere in the PDF

   - A value exists ONLY if the row is explicitly present in the same section.
     If the row is absent → return null.
END OF INSTRUCTIONS.
`;

export const PELNGInvoiceSchema = z.object({
  // ค่าบริการสถานี = รวมจำนวนเงินค่าบริการส่วนต้นทุนคงที่ + ค่าบริการต้นทุนผันแปร (ยอดรวมส่วนบริการ)
  station_service_fee_thb: z
    .number()
    .nonnegative()
    .describe(
      "Station/Terminal Service Fee (THB), equals sum of fixed-cost and variable-cost service amounts | " +
        "ค่าบริการสถานี (บาท) = รวมจำนวนเงินค่าบริการส่วนต้นทุนคงที่ + ค่าบริการต้นทุนผันแปร"
    ),

  // Fixed-Cost Service (ค่าบริการส่วนต้นทุนคงที่)
  fixed_cost_quantity_mmbtu: z
    .number()
    .nonnegative()
    .describe(
      "Fixed-Cost Service Quantity (MMBTU) | ปริมาณค่าบริการส่วนต้นทุนคงที่ (หน่วย: MMBTU/ล้านBTU)"
    ),
  fixed_cost_unit_price_thb_per_mmbtu: z
    .number()
    .nonnegative()
    .describe(
      "Fixed-Cost Service Unit Price (THB/MMBTU) | ราคาต่อหน่วยค่าบริการส่วนต้นทุนคงที่ (บาท/MMBTU)"
    ),
  fixed_cost_amount_thb: z
    .number()
    .nonnegative()
    .describe(
      "Fixed-Cost Service Amount (THB) | จำนวนเงินค่าบริการส่วนต้นทุนคงที่ (บาท)"
    ),

  // Variable-Cost Service (ค่าบริการส่วนต้นทุนผันแปร)
  variable_cost_quantity_mmbtu: z
    .number()
    .nonnegative()
    .describe(
      "Variable-Cost Service Quantity (MMBTU) | ปริมาณค่าบริการส่วนต้นทุนผันแปร (หน่วย: MMBTU/ล้านBTU)"
    ),
  variable_cost_unit_price_thb_per_mmbtu: z
    .number()
    .nonnegative()
    .describe(
      "Variable-Cost Service Unit Price (THB/MMBTU) | ราคาต่อหน่วยค่าบริการส่วนต้นทุนผันแปร (บาท/MMBTU)"
    ),
  variable_cost_amount_thb: z
    .number()
    .nonnegative()
    .describe(
      "Variable-Cost Service Amount (THB) | จำนวนเงินค่าบริการส่วนต้นทุนผันแปร (บาท)"
    ),

  // มูลค่า RLNG รวม
  rlng_total_value_thb: z
    .number()
    .nonnegative()
    .describe("RLNG Total Value (THB) | มูลค่า RLNG รวม / มูลค่ารวม RLNG (บาท)"),

  // มูลค่ารวม (ยอดรวมทั้งสิ้นของเอกสาร หากมี)
  total_amount_thb: z
    .number()
    .nonnegative()
    .describe(
      "Total Amount (THB) [NOT Grand Total] | มูลค่ารวมก่อน Tax / จำนวนเงินก่อน Tax (บาท) "
    ),

  // Optional helpers
  currency: z
    .string()
    .default("THB")
    .describe("Currency code | รหัสสกุลเงิน (เช่น THB, USD)"),
  notes: z
    .string()
    .optional()
    .describe("Additional notes or remarks | หมายเหตุเพิ่มเติม"),

  fixed_cost_ld_phase_1_5_mtpa_quantity: z
    .number()
    .nonnegative()
    .optional()
    .describe("Fixed-Cost Ld Quantity (MMBTU)"),

  fixed_cost_ld_phase_1_5_mtpa_price_per_unit: z
    .number()
    .nonnegative()
    .optional()
    .describe("Fixed-Cost Ld Unit Price (THB/MMBTU)"),

  fixed_cost_ld_phase_1_5_mtpa_amount_baht: z
    .number()
    .nonnegative()
    .optional()
    .describe("Fixed-Cost Ld Amount (THB)"),

  variable_cost_lc_phase_1_quantity: z
    .number()
    .nonnegative()
    .optional()
    .describe("Fixed-Cost Lc Amount (THB)"),

  variable_cost_lc_phase_1_price_per_unit: z
    .number()
    .nonnegative()
    .optional()
    .describe("Fixed-Cost Lc Amount (THB)"),

  variable_cost_lc_phase_1_amount_baht: z
    .number()
    .nonnegative()
    .optional()
    .describe("Fixed-Cost Lc Amount (THB)"),

  // // page 8
  fixed_cost_ld_phase_2_5_mtpa_quantity : z
    .number()
    .nonnegative()
    .optional()
    .describe("Fixed-Cost Ld Amount (THB)"),
    
  fixed_cost_ld_phase_2_5_mtpa_price_per_unit: z
    .number()
    .nonnegative()
    .optional()
    .describe("Fixed-Cost Ld Amount (THB)"),

  fixed_cost_ld_phase_2_5_mtpa_amount_baht: z
    .number()
    .nonnegative()
    .optional()
    .describe("Fixed-Cost Ld Amount (THB)"),

  variable_cost_lc_phase_2_quantity: z
    .number()
    .nonnegative()
    .optional()
    .describe("Fixed-Cost Lc Amount (THB)"),

  variable_cost_lc_phase_2_price_per_unit: z
    .number()
    .nonnegative()
    .optional()
    .describe("Fixed-Cost Lc Amount (THB)"),

  variable_cost_lc_phase_2_amount_baht: z
    .number()
    .nonnegative()
    .optional()
    .describe("Fixed-Cost Lc Amount (THB)"),

  // page 9

  fixed_cost_ld_05_mtpa_quantity : z
    .number()
    .nonnegative()
    .optional()
    .describe("Fixed-Cost Ld Unit Price (THB/MMBTU) | ค่าบริการส่วนต้นทุนคงที่ (Ld)"),

  fixed_cost_ld_05_mtpa_price_per_unit: z
    .number()
    .nonnegative()
    .optional()
    .describe("Fixed-Cost Ld Unit Price (THB/MMBTU) | ค่าบริการส่วนต้นทุนคงที่ (Ld)"),

  fixed_cost_ld_05_mtpa_amount_baht: z
    .number()
    .nonnegative()
    .optional()
    .describe("Fixed-Cost Ld Unit Price (THB/MMBTU) | ค่าบริการส่วนต้นทุนคงที่ (Ld)"),

  variable_cost_lc_phase_1_05_mtpa_quantity: z
    .number()
    .nonnegative()
    .optional()
    .describe("Fixed-Cost Lc Amount (THB)"),

  variable_cost_lc_phase_1_05_mtpa_price_per_unit: z
    .number()
    .nonnegative()
    .optional()
    .describe("Fixed-Cost Lc Amount (THB)"),

  variable_cost_lc_phase_1_05_mtpa_amount_baht: z
    .number()
    .nonnegative()
    .optional()
    .describe("Fixed-Cost Lc Amount (THB)"),

  variable_cost_lc_phase_2_05_mtpa_quantity: z
    .number()
    .nonnegative()
    .optional()
    .describe("Fixed-Cost Lc Amount (THB)"),

  variable_cost_lc_phase_2_05_mtpa_price_per_unit: z
    .number()
    .nonnegative()
    .optional()
    .describe("Fixed-Cost Lc Amount (THB)"),

  variable_cost_lc_phase_2_05_mtpa_amount_baht: z
    .number()
    .nonnegative()
    .optional()
    .describe("Fixed-Cost Lc Amount (THB)"),

  fixed_cost_ld_07_mtpa_quantity : z
    .number()
    .nonnegative()
    .optional()
    .describe("Fixed-Cost Ld Unit Price (THB/MMBTU)"),

  fixed_cost_ld_07_mtpa_price_per_unit: z
    .number()
    .nonnegative()
    .optional()
    .describe("Fixed-Cost Ld Unit Price (THB/MMBTU)"),

  fixed_cost_ld_07_mtpa_amount_baht: z
    .number()
    .nonnegative()
    .optional()
    .describe("Fixed-Cost Ld Unit Price (THB/MMBTU)"),

  variable_cost_lc_07_mtpa_quantity: z
    .number()
    .nonnegative()
    .optional()
    .describe("Fixed-Cost Lc Amount (THB)"),

  variable_cost_lc_07_mtpa_price_per_unit: z
    .number()
    .nonnegative()
    .optional()
    .describe("Fixed-Cost Lc Amount (THB)"),

  variable_cost_lc_07_mtpa_amount_baht: z
    .number()
    .nonnegative()
    .optional()
    .describe("Fixed-Cost Lc Amount (THB)"),

  // lmpt2_station_service_fees_total_baht: fixed_cost_total_amount
  //   .optional()
  //   .describe(
  //     "Total fees for LMPT2 context"
  // )

  lmpt2_station_service_fees_total_baht: z
    .number()
    .nonnegative()
    .optional()
    .describe("รวมจำนวนเงิน | Total Amount"),

  no_1_rate_baht_per_mmbtu: z
    .number()
    .nonnegative()
    .optional()
    .describe("ราคา LNG สำหรับเที่ยวที่ 1 เดือน สิงหาคม 2568 | รวมค่าเนื้อ LNG และค่าใช้จ่ายนำเข้า"),

  no_2_rate_baht_per_mmbtu: z
    .number()
    .nonnegative()
    .optional()
    .describe("ราคา LNG สำหรับเที่ยวที่ 2 เดือน สิงหาคม 2568 | รวมค่าเนื้อ LNG และค่าใช้จ่ายนำเข้า"),

  no_3_rate_baht_per_mmbtu:z
    .number()
    .nonnegative()
    .optional()
    .describe("ราคา LNG สำหรับเที่ยวที่ 3 เดือน สิงหาคม 2568 | รวมค่าเนื้อ LNG และค่าใช้จ่ายนำเข้า"),

  no_4_rate_baht_per_mmbtu: z
    .number()
    .nonnegative()
    .optional()
    .describe("ราคา LNG สำหรับเที่ยวที่ 4 เดือน สิงหาคม 2568 | รวมค่าเนื้อ LNG และค่าใช้จ่ายนำเข้า"),

  no_5_rate_baht_per_mmbtu:z
    .number()
    .nonnegative()
    .optional()
    .describe("ราคา LNG สำหรับเที่ยวที่ 5 เดือน สิงหาคม 2568 | รวมค่าเนื้อ LNG และค่าใช้จ่ายนำเข้า"),
  
});

export type PELNGInvoice = z.infer<typeof PELNGInvoiceSchema>;
