import { z } from "zod";

export const registerMemberSchema = z.object({
  name: z.string().min(2),
  email: z
    .string()
    .email()
    .transform((e) => e.trim().toLowerCase()),
  password: z.string().min(6),
  phoneNumber: z.string().min(10).max(20).optional(),
  packageId: z.string().min(1).default("starter"),
  referralCode: z.string().optional(),
  position: z.enum(["left", "right"]).optional(),
});

export const createMemberSchema = z.object({
  name: z.string().min(1),
  phoneNumber: z.string().min(10).max(20).optional(),
  packageId: z.string().min(1),
  directReferralSales: z.number().min(0),
  leftVolume: z.number().min(0),
  rightVolume: z.number().min(0),
});

export type RegisterMemberInput = z.infer<typeof registerMemberSchema>;
export type CreateMemberInput = z.infer<typeof createMemberSchema>;
