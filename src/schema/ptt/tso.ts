import { z } from "zod";

const RequestedGasVolumesSchema = z.object({
  volumeArea2KhanomMMBTU: z
    .number()
    .describe("ปริมาณก๊าซฯ บนระบบท่อฯบนฝั่งขนอม (พื้นที่ 2)"),

  volumeArea3OnshoreMMBTU: z
    .number()
    .describe("ปริมาณก๊าซฯ บนระบบท่อฯบนฝั่ง (พื้นที่ 3)"),

  volumeArea4ChanaMMBTU: z
    .number()
    .describe("ปริมาณก๊าซฯ บนระบบท่อฯบนฝั่งจะนะ (พื้นที่ 4)"),
});

export type PttRequestedGasVolumes = z.infer<typeof RequestedGasVolumesSchema>;

const systemPrompt = `You are a highly specialized data extraction system. Your task is to process the provided PDF text, which contains a table of natural gas volumes, and extract ONLY three specific data fields into a structured JSON object.

### Extraction Instructions:
1.  **Identify the Gas Volume Table:** Locate the table titled "ข้อมูลปริมาณก๊าซธรรมชาติทุกจุดจ่ายออกและค่าบริการระบบท่อส่งก๊าซธรรมชาตินอกชายฝั่ง (พื้นที่ 1)" or a similar section listing volumes by "พื้นที่" (Area).
2.  **Extract Specific Gas Volumes:** Extract the precise numeric values for gas volume in **Million BTU** for the following three areas:
    * **Area 2 (พื้นที่ 2) - ขนอม** (Field: volumeArea2KhanomMMBTU) 
    * **Area 3 (พื้นที่ 3) - บนฝั่ง** (Field: volumeArea3OnshoreMMBTU) 
    * **Area 4 (พื้นที่ 4) - จะนะ** (Field: volumeArea4ChanaMMBTU) 

### Data Transformation and Output:
* **Convert all extracted numeric values into standard integer numbers** (TypeScript \`number\` type).
* **Remove all commas (,) and any special characters** (like the asterisk '*') from the numeric values before conversion. For example, "87,753,753*" should be converted to 87753753.
* The final output **MUST** be a single, valid JSON object strictly conforming to the \`RequestedGasVolumesSchema\`.
* **DO NOT include any other data fields** outside of the three specified (Area 2, Area 3, Area 4). Do not include the report date, service charges, or other delivery points.
* Do not include any explanatory text, code fences, or markdown beyond the final JSON object.`;

export const pttTSOSchemaAndPrompt = {
  gasAmount: {
    systemPrompt,
    schema: RequestedGasVolumesSchema,
  },
};
