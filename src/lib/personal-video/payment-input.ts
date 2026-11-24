import { z } from "zod";

// Strip all caller-supplied financial/identity fields at the authenticated boundary.
export const pvgPaymentInput = z.object({
  projectId: z.string().uuid(),
  previousVideoId: z.string().uuid().nullable(),
  again: z.boolean().optional(),
});
