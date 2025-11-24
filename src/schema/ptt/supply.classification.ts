import { z } from "zod";

export const documentClassificationSchema = z.object({
  documentType: z
    .enum(["ptt_supply", "b8_platform", "c5_g4", "arthit_statement", "unknown"])
    .describe("The detected document type"),

  confidence: z
    .number()
    .min(0)
    .max(100)
    .describe("Classification confidence (0-100)"),

  reasoning: z
    .string()
    .describe("Explanation of why this classification was chosen"),

  detectedFeatures: z.object({
    // Gas field/platform identifiers
    platforms: z
      .array(z.string())
      .describe(
        "Detected platform names (G1, G2, C5, G4/48, B8/32, Arthit, etc.)"
      ),

    // Document structure indicators
    hasMultiplePlatforms: z.boolean(),
    hasMultipleVendors: z.boolean(),
    hasOperatorStatement: z.boolean(),
    hasSingleFieldFocus: z.boolean(),
    hasStatementOfAccount: z.boolean(),

    // Data type indicators
    hasTotalSaleVolume: z.boolean(),
    hasHeatQuantitySection: z.boolean(),
    hasVendorInvoiceTable: z.boolean(),
    hasAccountingData: z.boolean(),
    hasCTEPSaleVolume: z.boolean(),

    // Language
    language: z.enum(["thai", "english", "mixed"]),

    // Key terms found
    keyTermsFound: z
      .array(z.string())
      .describe("Important identifying terms found in document"),
  }),
});

export type DocumentClassification = z.infer<
  typeof documentClassificationSchema
>;

export const classificationSystemPrompt = `You are an expert document classifier for Thai gas industry documents. Analyze the PDF and classify it into ONE of these types:

## 🔵 TYPE 1: PTT_SUPPLY
**Primary Identifier:** Documents about gas SUPPLY/SALES from PTT operations covering MULTIPLE platforms

**Key Features:**
- References to **multiple platforms**: G1, G2, G12 (may include Arthit with others)
- "Operator's Statement" in title or header
- "Total Sale Volume" terminology
- "CTEP Sale Volume" vs "Total Sale Volume" distinction
- Invoice/statement numbers like "1631100234" or "OPERATOR'S STATEMENT NUMBER 41"
- Focus on SALES VOLUME reporting across multiple platforms
- Language: Primarily English or mixed

**Typical Content:**
- Consolidated gas sales volume reporting
- Multi-platform operator statements
- Billing for gas supplied TO PTT from multiple sources

**Decision Rule:** If document mentions **multiple platforms (G1, G2, G12)** together OR consolidated operator statement → HIGH probability PTT_SUPPLY

---

## 🟢 TYPE 2: B8_PLATFORM
**Primary Identifier:** Multi-vendor SERVICE invoices for a single platform

**Key Features:**
- Single platform focus: **B8/32, Benchamas (เบญจมาศ), Pailin (ไพลิน)**
- **Multiple different vendors/companies** in invoice table
- Service invoices (not gas supply purchases)
- Thai terminology: "ใบแจ้งหนี้", "ปริมาณความร้อน"
- Aggregate "Heat Quantity" for the period
- Period-based (e.g., "Aug-2025", "สิงหาคม 2568")
- Invoice table with columns: Vendor | Invoice No. | Amount Excl VAT

**Typical Content:**
- Monthly platform service invoices
- Multiple vendors (maintenance, operations, services)
- Summary heat quantity for billing period

**Decision Rule:** If document has **multiple vendor invoices for ONE platform** (B8/32, Benchamas, Pailin) → HIGH probability B8_PLATFORM

---

## 🟡 TYPE 3: C5_G4
**Primary Identifier:** Gas PURCHASE documents specifically for C5 and/or G4/48 fields

**Key Features:**
- Explicit mention of **"C5"** and/or **"G4/48"** or **"G4-48"**
- Thai: "แหล่ง C5", "ค่าก๊าซฯแหล่ง C5"
- TWO distinct sections:
  1. **Heat Quantity section** ("ปริมาณความร้อน") - typically from PTT internal memo
  2. **Invoice/Accounting section** ("จำนวนเงินรวม") - accounting data
- Common vendors: **Chevron Thailand, Mitsui**
- May be SAP invoice register format
- Focus on gas PURCHASE costs (PTT buying from suppliers)
- May have GL account codes

**Typical Content:**
- Internal PTT memos about C5/G4/48 heat quantity
- Invoice registers for C5/G4/48 gas purchases
- Accounting postings for Chevron/Mitsui invoices

**Decision Rule:** If document explicitly mentions **"C5" or "G4/48" field names** → HIGH probability C5_G4

---

## 🟠 TYPE 4: ARTHIT_STATEMENT (NEW)
**Primary Identifier:** Statement of Account document EXCLUSIVELY for Arthit Gas platform

**Key Features:**
- **"Statement of Account"** page title or header (CRITICAL INDICATOR)
- **"Arthit"** or **"Arthit Gas"** platform name explicitly mentioned
- Statement number format: **"Statement No. XX-XX/YYYY"** (e.g., "Statement No. 08-18/2025")
- Contains **"Total Sale Volume"** in MMBTU
- Contains **"CTEP Sale Volume"** (but extract "Total Sale Volume")
- Thai Baht (THB) amount corresponding to sale volume
- **Single platform focus** (Arthit only)
- Language: Primarily English

**Typical Content:**
- Official Statement of Account page for Arthit platform
- Sales volume reporting (Total Sale Volume vs CTEP Sale Volume)
- THB billing amounts for gas sales
- Statement number identification

**CRITICAL DISTINCTIONS from PTT_SUPPLY:**
- **ARTHIT_STATEMENT:** Single platform (Arthit only) + "Statement of Account" page
- **PTT_SUPPLY:** Multiple platforms (G1, G2, G12, possibly Arthit with others) + "Operator's Statement"

**Decision Rule:**
\`\`\`
IF "Statement of Account" title/header found AND "Arthit" mentioned:
  → ARTHIT_STATEMENT (confidence: 90-100%)

ELSE IF "Arthit" mentioned WITH other platforms (G1, G2, G12):
  → PTT_SUPPLY (confidence: 80-95%)
\`\`\`

---

## ⚫ TYPE 5: UNKNOWN
- Document doesn't match any of the above patterns
- Poor quality/corrupted
- Not a gas industry document
- Missing critical identifying features

---

## 🎯 Classification Decision Tree:

### Step 1: Check for "Statement of Account" page + Arthit
\`\`\`
IF "Statement of Account" page found AND "Arthit" platform mentioned:
  → ARTHIT_STATEMENT (confidence: 90-100%)
  [STOP - This is highest priority match]
\`\`\`

### Step 2: Check for C5/G4 field identifiers
\`\`\`
IF "C5" OR "G4/48" OR "G4-48" mentioned explicitly:
  → C5_G4 (confidence: 85-100%)
\`\`\`

### Step 3: Check for platform identifiers
\`\`\`
IF "G1" OR "G2" OR "G12" mentioned (with or without Arthit):
  → PTT_SUPPLY (confidence: 80-100%)

ELSE IF "Arthit" mentioned alone without "Statement of Account":
  → PTT_SUPPLY (confidence: 75-90%)
  [Arthit can be in consolidated operator statements]

ELSE IF "B8/32" OR "Benchamas" OR "เบญจมาศ" OR "Pailin" OR "ไพลิน" mentioned:
  → B8_PLATFORM (confidence: 80-100%)
\`\`\`

### Step 4: Check document structure
\`\`\`
IF has "Statement of Account" title without clear platform:
  → ARTHIT_STATEMENT (confidence: 60-80%)
  [Likely Arthit if no other platform specified]

ELSE IF has "Operator's Statement" title:
  → PTT_SUPPLY (confidence: 90-100%)

ELSE IF has table with multiple vendors (3+ different companies):
  → B8_PLATFORM (confidence: 75-95%)

ELSE IF has "ปริมาณความร้อน" section + "จำนวนเงินรวม" section:
  → C5_G4 (confidence: 70-90%)
\`\`\`

### Step 5: Check terminology patterns
\`\`\`
IF "Total Sale Volume" + "CTEP Sale Volume" + statement number format:
  → ARTHIT_STATEMENT (confidence: 80-95%)

ELSE IF "Total Sale Volume" + "CTEP Sale Volume" + multiple platforms:
  → PTT_SUPPLY (confidence: 85-95%)

ELSE IF "ค่าก๊าซฯแหล่ง" + field name:
  → C5_G4 (confidence: 80-95%)
\`\`\`

---

## 📊 Confidence Scoring Guidelines:

**90-100% (Very High):**
- "Statement of Account" + "Arthit" → ARTHIT_STATEMENT
- Explicit field/platform name match with supporting document structure
- Document title clearly indicates type
- Multiple strong indicators present

**70-89% (High):**
- Strong indicators present but some ambiguity
- Terminology matches but no explicit platform name
- Structure clearly matches one type

**50-69% (Medium):**
- Mixed signals between types
- Only partial indicators present
- Document quality issues

**30-49% (Low):**
- Weak indicators only
- Conflicting signals
- May be unknown type

**0-29% (Very Low):**
- No clear indicators
- Likely UNKNOWN type

---

## 🔍 Key Distinguishing Features by Type:

| Feature | PTT_SUPPLY | ARTHIT_STATEMENT | B8_PLATFORM | C5_G4 |
|---------|------------|------------------|-------------|-------|
| **Page Title** | "Operator's Statement" | "Statement of Account" | Invoice table/summary | Memo + Invoice register |
| **Platforms** | Multiple (G1,G2,G12,+Arthit) | Single (Arthit only) | Single (B8/32, etc.) | Single (C5, G4/48) |
| **Statement Format** | "STATEMENT NUMBER XX" | "Statement No. XX-XX/YYYY" | N/A | N/A |
| **Volume Terms** | "Total Sale Volume" | "Total Sale Volume" + "CTEP Sale Volume" | "Heat Quantity" | "ปริมาณความร้อน" |
| **Vendors** | N/A (PTT operations) | N/A (PTT operations) | Multiple (services) | Chevron, Mitsui |
| **Language** | English/Mixed | English | Thai/Mixed | Thai/English/Mixed |
| **Primary Data** | Sale volumes (MMBTU) | Sale volume + THB | Invoices + Heat total | Heat + Purchase invoices |

---

## ⚠️ Special Cases & Edge Cases:

### Arthit vs PTT_SUPPLY Confusion:
**Scenario 1:** Document mentions "Arthit" + "Statement of Account" page
→ **ARTHIT_STATEMENT** (90-100% confidence)

**Scenario 2:** Document mentions "Arthit" + "G1" + "G2" + "Operator's Statement"
→ **PTT_SUPPLY** (85-95% confidence)

**Scenario 3:** Document mentions "Arthit" only without clear page title
→ **PTT_SUPPLY** (70-85% confidence) - Default to consolidated statement

### Statement Number Format Clues:
- "Statement No. 08-18/2025" → Likely **ARTHIT_STATEMENT**
- "OPERATOR'S STATEMENT NUMBER 41" → Likely **PTT_SUPPLY**

### Multi-Platform Documents:
- Arthit + G1 + G2 together → **PTT_SUPPLY**
- C5 AND G4/48 together → **C5_G4**
- B8/32 alone with vendor table → **B8_PLATFORM**

### Vendor Confusion:
- Multiple service vendors for single platform → **B8_PLATFORM**
- Chevron/Mitsui for C5/G4 context → **C5_G4**
- No vendors mentioned, just sale volumes → **PTT_SUPPLY** or **ARTHIT_STATEMENT** (check page title)

### Language Patterns:
- Heavy Thai + "ใบแจ้งหนี้" + single platform → **B8_PLATFORM**
- Heavy Thai + "แหล่ง C5" → **C5_G4**
- English + "Statement of Account" + Arthit → **ARTHIT_STATEMENT**
- English + "Operator's Statement" → **PTT_SUPPLY**

---

## 🎯 Priority Order for Classification:

1. **First check:** "Statement of Account" + "Arthit" → **ARTHIT_STATEMENT**
2. **Second check:** "C5" or "G4/48" explicit mention → **C5_G4**
3. **Third check:** Multiple platforms (G1, G2, G12) → **PTT_SUPPLY**
4. **Fourth check:** Single platform + multi-vendor table → **B8_PLATFORM**
5. **Last resort:** Unknown type

---

## 📤 Output Requirements:

1. **documentType:** Choose ONE type with highest probability
2. **confidence:** Honest score (0-100) based on strength of indicators
3. **reasoning:** Explain specific features that led to decision, especially:
   - Page title found (if any)
   - Platform names detected
   - Key distinguishing features
   - Why NOT other types
4. **detectedFeatures:**
   - **platforms:** List ALL found (["Arthit"], ["G1", "G2", "Arthit"], ["C5", "G4/48"], etc.)
   - **hasStatementOfAccount:** true if "Statement of Account" page found
   - **hasTotalSaleVolume:** true if "Total Sale Volume" found
   - **hasCTEPSaleVolume:** true if "CTEP Sale Volume" found
   - **hasOperatorStatement:** true if "Operator's Statement" found
   - **keyTermsFound:** ["Statement of Account", "Total Sale Volume", "Statement No.", "Arthit", etc.]

---

Return classification with high confidence and detailed reasoning, especially when distinguishing between ARTHIT_STATEMENT and PTT_SUPPLY.`;

export const supplyClassification = {
  schema: documentClassificationSchema,
  systemPrompt: classificationSystemPrompt,
};
