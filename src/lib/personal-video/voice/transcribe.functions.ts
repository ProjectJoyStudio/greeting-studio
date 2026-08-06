import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const input = z.object({
  base64: z.string().min(16),
  mimeType: z.string().min(3).max(80),
  language: z.string().max(8).nullable().optional(),
});

/** Writes down what was said in a short enrollment sample. */
export const hearVoiceSample = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => input.parse(data))
  .handler(async ({ data }) => {
    const { transcribeSample } = await import("./transcribe.server");
    const text = await transcribeSample(data).catch(() => null);
    return { text };
  });
