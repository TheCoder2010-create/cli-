import { z } from 'zod';

export const riskLevelSchema = z.enum(['low', 'medium', 'high']);

/**
 * A single executable or advisory step in a generated plan.
 */
export const PlanStep = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  command: z.string().min(1).nullable(),
  risk: riskLevelSchema,
  requiresConfirmation: z.boolean()
});

/**
 * A validated plan returned by an AI planner model.
 */
export const Plan = z.object({
  summary: z.string().min(1),
  overallRisk: riskLevelSchema,
  steps: z.array(PlanStep).min(1),
  warnings: z.array(z.string().min(1))
});

export type PlanStep = z.infer<typeof PlanStep>;
export type Plan = z.infer<typeof Plan>;
export type RiskLevel = z.infer<typeof riskLevelSchema>;
