import { z } from "zod";

export const LNGCargoSchemaFlat = z.object({
  // Voyage/Shipment Details
  voyage_seller_name: z
    .string()
    .describe(
      "Seller / Seller Name / Supplier / ผู้ขาย / ผู้จำหน่าย / คู่สัญญาขาย; ชื่อบริษัทที่ขาย LNG ในส่วนข้อมูลเที่ยวเรือ"
    ),
  voyage_payment_due_date: z
    .string()
    .describe(
      "Payment Due / Due Date / Payment Terms / กำหนดชำระเงิน / วันครบกำหนดชำระ; ควรเป็นรูปแบบวันที่ ISO (YYYY-MM-DD) หากทราบ มิฉะนั้นส่งสตริงที่พบ"
    ),
  voyage_vessel_name: z
    .string()
    .describe(
      "Vessel / Vessel Name / Ship Name / ชื่อเรือ / เรือที่ขนส่ง ในส่วนข้อมูลเที่ยวเรือ"
    ),
  voyage_load_port: z
    .string()
    .describe(
      "Loading Port / Load Port / Port of Loading / Origin Port / ท่าเรือต้นทาง / ท่าเรือบรรทุก / ท่าเรือต้นทางการขนส่ง"
    ),
  voyage_quantity_mmbtu: z
    .number()
    .describe(
      "Quantity in MMBTU / Unloaded Quantity / Total Energy / ปริมาณ (ล้านบีทียู) ที่ส่งมอบ หน่วย MMBTU"
    ),
  voyage_price_usd_per_mmbtu: z
    .number()
    .describe(
      "Unit Price USD/MMBTU / LNG Price DES / Ex-Ship Price / ราคา USD ต่อ MMBTU / ราคาต่อหน่วยพลังงาน ในส่วนการคำนวณราคา"
    ),
  voyage_net_amount_usd: z
    .number()
    .describe(
      "Net Invoice Amount USD / Total Invoice USD / Invoice Value / มูลค่าสุทธิเป็นดอลลาร์ / ยอดรวมในใบแจ้งหนี้ก่อนรวมค่าใช้จ่ายอื่น"
    ),
  voyage_total_amount_incl_gst: z
    .number()
    .optional()
    .describe(
      "Grand Total including GST/VAT / Final Total / มูลค่ารวมทั้งหมดรวมภาษีมูลค่าเพิ่ม / ยอดรวมสุทธิสุดท้าย; หากเอกสารไม่ระบุให้ข้ามได้"
    ),

  // Unloading/Quality
  unloading_higher_heating_value: z
    .number()
    .optional()
    .describe(
      "HHV / GHV / Higher Heating Value / Gross Heating Value / ค่าความร้อนสูงสุด (เช่น BTU/Scf); ดึงเฉพาะตัวเลข ในส่วนคุณภาพหรือการขนถ่าย"
    ),

  // Quantity/Delivery
  quantity_net_delivered: z
    .number()
    .optional()
    .describe(
      "Net Delivered (Metric Tons, MT only) / ปริมาณส่งมอบสุทธิเป็นหน่วยตันเมตริกเท่านั้น; หากเอกสารให้หลายหน่วย ให้เลือกค่าที่เป็น Metric Tons (MT)"
    ),

  // Survey/Inspection
  survey_fee_before_tax: z
    .number()
    .optional()
    .describe(
      "Surveyor Fee excluding VAT / Survey Fee before tax / Inspection Fee / ค่าตรวจสอบสินค้า (ไม่รวมภาษี)"
    ),

  // Exchange rate
  exchange_rate_usd_to_thb: z
    .number()
    .optional()
    .describe(
      "FX rate 1 USD = ? THB / อัตราแลกเปลี่ยน ดอลลาร์สหรัฐต่อบาทไทย (เช่น 1 USD = 32.4975 THB); ดึงเฉพาะตัวเลขฝั่ง THB ต่อ 1 USD"
    ),

  // Customs/Import Services - ONLY final page totals marked with 'รวมทั้งสิ้น' or equivalent
  customs_clearance_services: z
    .array(
      z.object({
        description: z
          .string()
          .optional()
          .describe(
            "ONLY the exact label for the final total line: 'รวมทั้งสิ้น' / 'Total' / 'Grand Total' / or similar final summary label found on the page"
          ),
        final_cost: z
          .number()
          .describe(
            "The FINAL TOTAL amount shown at 'รวมทั้งสิ้น' or equivalent summary line; NOT individual line items or sub-totals"
          ),
        currency: z
          .string()
          .optional()
          .describe("Currency (THB/USD/etc.) / สกุลเงิน"),
        reference_no: z
          .string()
          .optional()
          .describe(
            "Invoice Number / Reference / Bill No. / เลขที่บิล / เลขที่อ้างอิง (ถ้ามี)"
          ),
      })
    )
    .describe(
      "Array of customs clearance FINAL TOTALS only (e.g., 'รวมทั้งสิ้น' lines). Do NOT include individual line items, breakdowns, or sub-amounts. Only extract the final aggregated total for each page or invoice section."
    ),
});

export type LNGCargoFlat = z.infer<typeof LNGCargoSchemaFlat>;

export const CARGO_SYSTEM_PROMPT = `You are a specialized data extraction assistant for LNG cargo shipping documents. Extract structured information into the provided schema. Documents may be in English, Thai, or mixed.

EXTRACTION RULES:
1) Language: Handle Thai (ภาษาไทย) and English. Do not translate values; capture as shown.
2) Numbers: Remove commas and units; extract numeric values only.
3) Dates: Prefer ISO YYYY-MM-DD; if ambiguous, return the raw date string.
4) Currency: Keep numeric values separate from currency symbols. Use the 'currency' field where applicable.

FIELD-SPECIFIC INSTRUCTIONS:
- voyage_seller_name: Company selling LNG (labels may include Seller/Supplier/ผู้ขาย/ผู้จำหน่าย/คู่สัญญา).
- voyage_payment_due_date: Payment due/due date/กำหนดชำระ.
- voyage_vessel_name: Vessel/Ship/ชื่อเรือ.
- voyage_load_port: Loading Port/Port of Loading/ท่าเรือต้นทาง.
- voyage_quantity_mmbtu: Energy quantity in MMBTU (MMBtu, million BTU, etc.). Extract the MMBTU figure.
- voyage_price_usd_per_mmbtu: Unit price in USD per MMBTU (DES/Ex-Ship).
- voyage_net_amount_usd: Net invoice amount in USD (total on invoice before other local charges).
- voyage_total_amount_incl_gst: Final grand total including GST/VAT if explicitly shown; otherwise omit.

- unloading_higher_heating_value: HHV/GHV numeric value only (e.g., BTU/Scf).

- quantity_net_delivered: Return NET DELIVERED strictly in Metric Tons (MT). If both MMBTU and MT are present, choose the MT number.

- survey_fee_before_tax: Surveyor/Inspection fee before tax (exclude VAT).

- exchange_rate_usd_to_thb: Extract FX rate as the numeric THB per 1 USD (e.g., "32.4975" for "1 USD = 32.4975 THB"). If multiple rates exist, prefer the BOT announced selling rate on unloading/settlement date.

CUSTOMS CLEARANCE SERVICES (ARRAY) - CRITICAL RULES:
⚠️ ONLY extract FINAL TOTAL lines (e.g., "รวมทั้งสิ้น", "Total", "Grand Total", "Net Total").
⚠️ DO NOT extract individual line items, sub-amounts, or breakdowns (e.g., fees of 25000, 200, 3280, 1000).
⚠️ Look for the FINAL AGGREGATED SUM that represents the complete cost for that section/page.
⚠️ If a page shows: 25000 + 200 + 3280 + 1000 = 29480, ONLY extract 29480 (the final total).
⚠️ The "description" field should contain ONLY the exact label of the final total line (e.g., "รวมทั้งสิ้น", "Total Amount", "Net Total").
⚠️ Do NOT add explanatory text like "as per breakdown" or "page 1" in the description.
⚠️ If multiple pages each have a "รวมทั้งสิ้น" line, include one array entry per page's final total.

Examples of CORRECT customs_clearance_services extraction:
✓ { "description": "รวมทั้งสิ้น", "final_cost": 29480, "currency": "THB" }
✓ { "description": "Total", "final_cost": 29480, "currency": "THB" }
✓ { "description": "Customs Clearance Service", "final_cost": 29480, "currency": "THB" } (if that's the section header above the final total)

Examples of INCORRECT extraction (DO NOT DO THIS):
✗ { "description": "Customs Clearance (as per breakdown on page 1)", "final_cost": 25000, "currency": "THB" }
✗ { "description": "Service Fee", "final_cost": 200, "currency": "THB" }
✗ Multiple entries for line items that sum to a total

GENERAL:
- Only extract values explicitly present in the document; do not guess.
- If a field is not found, leave it undefined/null per schema behavior.
- Ignore repeated headers/footers.
- When conflicting values appear, prefer the most specific field near the relevant section header (e.g., use values from the invoice table for price/amount).

QUALITY CHECKS (soft):
- voyage_net_amount_usd ≈ voyage_quantity_mmbtu × voyage_price_usd_per_mmbtu (allow rounding).
- quantity_net_delivered (MT) should not be confused with MMBTU; keep them separate.
- exchange_rate_usd_to_thb should be THB per 1 USD.
- customs_clearance_services array should have few entries (typically 1-3 final totals), NOT many line items.

OUTPUT: Return only valid JSON conforming to the schema. Do not include explanations or markdown.`;
