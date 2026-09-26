import { z } from "zod";

export const documentIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);

export const interviewRequestSchema = z.object({
  type: z
    .enum([
      "technical",
      "behavioral",
      "mixed",
      "Technical",
      "Behavioral",
      "Mixed",
    ])
    .transform((value) => value.toLowerCase()),
  role: z.string().trim().min(2).max(120),
  level: z.string().trim().min(2).max(80),
  techstack: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .transform((value) =>
      value
        .split(",")
        .map((tech) => tech.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().max(80)).min(1).max(20)),
  amount: z.coerce.number().int().min(1).max(20),
  userid: documentIdSchema,
  company: z.string().trim().max(80).optional(),
});

export const feedbackRequestSchema = z.object({
  interviewId: documentIdSchema,
  userId: documentIdSchema,
  feedbackId: documentIdSchema.optional(),
  transcript: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().trim().min(1).max(8000),
      }),
    )
    .min(1)
    .max(300)
    .refine((messages) => messages.some((message) => message.role === "user")),
});
