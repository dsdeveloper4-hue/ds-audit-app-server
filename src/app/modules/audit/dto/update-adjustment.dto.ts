import { z } from "zod";

export const updateAdjustmentSchema = z.object({
  reduction_percentage: z
    .number()
    .min(0, "Reduction percentage must be at least 0")
    .max(100, "Reduction percentage cannot exceed 100"),
});

export type UpdateAdjustmentDto = z.infer<typeof updateAdjustmentSchema>;
