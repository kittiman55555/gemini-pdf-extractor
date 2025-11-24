import { generateObject } from "ai";
import { Data, Duration, Effect } from "effect";
import type { z } from "zod";
import { ModelProvider } from "./model.provider";

export class ExtractPdfError extends Data.TaggedError(
  "ExtractPDF/Process/Error"
)<{ error: unknown; message: string }> {}

export class ExtractPDFService extends Effect.Service<ExtractPDFService>()(
  "Service/ExtractPDF",
  {
    effect: Effect.gen(function* () {
      const models = yield* ModelProvider;
      const _SYSTEM_PROMPT_FOR_OTHER = `You are a professional document data extraction assistant specialized in extracting structured data from invoices and receipts.

            Your task is to:
            1. Carefully analyze the PDF document
            2. Extract all relevant invoice information accurately
            3. Return the data in the exact JSON schema format provided
            4. Use proper data types (numbers for amounts, strings for text, dates in YYYY-MM-DD format)
            5. If a field is not found or unclear, use null for optional fields or reasonable defaults
            6. For dates, convert any format to YYYY-MM-DD
            7. For amounts, extract only the numeric value without currency symbols
            8. Be precise and double-check numbers

            Quality guidelines:
            - Accuracy is critical - verify numbers match the document
            - If you're uncertain about a value, prefer null over guessing
            - Maintain consistent formatting across all extractions
            - Pay attention to line items and calculate totals if needed`;

      const processInline = <T>(
        pdfBuffer: Buffer,
        systemPrompt: string,
        schema: z.ZodType<T>
      ) =>
        Effect.tryPromise({
          try: async () => {
            const startTime = Date.now();
            console.log(
              `[ExtractPDF] Starting extraction. Size: ${pdfBuffer.length} bytes`
            );

            const result = await generateObject({
              model: models.gemini["2.5-flash"],
              system: systemPrompt,
              schema,
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "file",
                      data: pdfBuffer.toString("base64"),
                      mediaType: "application/pdf",
                    },
                    {
                      type: "text",
                      text: "Extract all invoice data from this PDF document according to the schema.",
                    },
                  ],
                },
              ],
            });

            const duration = Date.now() - startTime;
            console.log(`[ExtractPDF] Completed in ${duration}ms`);
            return result;
          },
          catch: (error) =>
            new ExtractPdfError({
              error,
              message: "extract pdf in-line error",
            }),
        }).pipe(
          Effect.timeout(Duration.minutes(5)),
          Effect.mapError((error) => {
            if (error instanceof ExtractPdfError) return error;
            return new ExtractPdfError({
              error,
              message: "Operation timed out after 5 minutes",
            });
          }),
          Effect.andThen((res) => res.object)
        );

      return {
        processInline,
      };
    }),
    dependencies: [ModelProvider.Default],
  }
) {}
