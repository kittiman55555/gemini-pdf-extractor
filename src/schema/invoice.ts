import z from "zod";

export const InvoiceSystemPrompt = `
    You are an expert invoice data extraction AI. Extract the following 5 key fields from the invoice:

    1. **quantity** - The total quantity/volume/amount of goods or services
       (Look for: ปริมาณ, จำนวน, Quantity, Volume, Units, etc.)

    2. **unitPriceTHBPerMMBTU** - The price per single unit
       (Look for: ราคาต่อหน่วย, ราคาหน่วยละ, Unit Price, Price/Unit, etc.)

    3. **subtotalTHB** - The amount BEFORE VAT (quantity × unit price)
       (Look for: จำนวนเงิน, มูลค่าสินค้า, ยอดรวมก่อน VAT, Subtotal, Amount Before Tax, etc.)

    4. **vatTHB** - The VAT/tax amount
       (Look for: ภาษีมูลค่าเพิ่ม, VAT, Tax Amount, etc.)

    5. **totalTHB** - The GRAND TOTAL (subtotal + VAT)
       (Look for: จำนวนเงินรวม, ยอดรวมทั้งสิ้น, Grand Total, Total Amount, Amount Due, etc.)

    Extract numbers only (remove commas, currency symbols). All amounts should be in THB.
    If you find a VAT rate percentage, include it as a decimal in vatRate (e.g., 7% = 0.07).

    nvoice content:
    `;

export const InvoiceSchema = z.object({
  // ปริมาณ - Quantity
  quantity: z
    .number()
    .nonnegative()
    .describe(
      "Quantity / Volume / Amount of goods or services | " +
        "ปริมาณ / จำนวน / ปริมาตร ของสินค้าหรือบริการ " +
        "(e.g., MMBTU, kWh, units, pieces, liters, kg, etc.)"
    ),

  // ราคาต่อหน่วย - Unit Price
  unitPriceTHBPerMMBTU: z
    .number()
    .nonnegative()
    .describe(
      "Unit Price / Price per Unit | " +
        "ราคาต่อหน่วย / ราคาหน่วยละ " +
        "(e.g., THB/MMBTU, THB/kWh, THB/piece, THB/kg, etc.)"
    ),

  // จำนวนเงิน - Subtotal (before VAT)
  subtotalTHB: z
    .number()
    .nonnegative()
    .describe(
      "Subtotal / Amount before VAT / Line total | " +
        "จำนวนเงิน / มูลค่าสินค้า/บริการ / ยอดรวมก่อน VAT / ราคารวม " +
        "(quantity × unit price, excluding VAT)"
    ),

  // ภาษีมูลค่าเพิ่ม - VAT Amount
  vatTHB: z
    .number()
    .nonnegative()
    .describe(
      "VAT Amount / Value Added Tax / Sales Tax | " +
        "ภาษีมูลค่าเพิ่ม / ภาษี VAT / ภาษีขาย " +
        "(usually 7% in Thailand, or other rates)"
    ),

  // จำนวนเงินรวม - Grand Total
  totalTHB: z
    .number()
    .nonnegative()
    .describe(
      "Grand Total / Total Amount / Net Amount / Amount Due | " +
        "จำนวนเงินรวม / ยอดรวมทั้งสิ้น / ยอดชำระ / จำนวนเงินสุทธิ " +
        "(subtotal + VAT)"
    ),

  // Optional metadata fields
  currency: z
    .string()
    .default("THB")
    .optional()
    .describe("Currency code | รหัสสกุลเงิน (e.g., THB, USD, EUR)"),

  vatRate: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe("VAT rate as decimal | อัตราภาษีมูลค่าเพิ่ม (e.g., 0.07 for 7%)"),

  notes: z
    .string()
    .optional()
    .describe("Additional notes or remarks | หมายเหตุเพิ่มเติม"),
});
/*
  .superRefine((val, ctx) => {
    // Consistency check: subtotal ≈ quantity * unitPrice
    if (
      val.quantity !== undefined &&
      val.unitPriceTHBPerMMBTU !== undefined &&
      val.subtotalTHB !== undefined
    ) {
      const expected = val.quantity * val.unitPriceTHBPerMMBTU;
      const diff = Math.abs(expected - val.subtotalTHB);
      // Allow tolerance for rounding (adjust as needed)
      if (diff > 2) {
        ctx.addIssue({
          code: "custom",
          path: ["subtotalTHB"],
          message: `Subtotal does not match quantity × unitPrice (difference ≈ $${diff.toFixed(2)}$$ {val.currency})`,
        });
      }
    }

    // Consistency check: total ≈ subtotal + VAT
    if (
      val.subtotalTHB !== undefined &&
      val.vatTHB !== undefined &&
      val.totalTHB !== undefined
    ) {
      const expected = val.subtotalTHB + val.vatTHB;
      const diff = Math.abs(expected - val.totalTHB);
      if (diff > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["totalTHB"],
          message: `Total does not equal subtotal + VAT (difference ≈ $${diff.toFixed(2)}$$ {val.currency})`,
        });
      }
    }
  });
   */

export type Invoice = z.infer<typeof InvoiceSchema>;
