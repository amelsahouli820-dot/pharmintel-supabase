import { z } from "zod";

export const loginSchema = z.object({ email: z.string().email().max(254).transform(v => v.toLowerCase().trim()), password: z.string().min(8).max(128) });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(8).max(128), newPassword: z.string().min(12).max(128).regex(/[A-Z]/, "Une majuscule est requise").regex(/[a-z]/, "Une minuscule est requise").regex(/[0-9]/, "Un chiffre est requis").regex(/[^A-Za-z0-9]/, "Un caractère spécial est requis") });
export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100), email: z.string().email().max(254).transform(v => v.toLowerCase().trim()),
  role: z.enum(["ADMIN", "USER"]).default("USER"), temporaryPassword: z.string().min(12).max(128),
  permissions: z.object({ canImport: z.boolean(), canUseAI: z.boolean(), canExport: z.boolean() }).default({ canImport: true, canUseAI: true, canExport: true })
});
export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(), role: z.enum(["ADMIN", "USER"]).optional(), status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  permissions: z.object({ canImport: z.boolean(), canUseAI: z.boolean(), canExport: z.boolean() }).optional(), temporaryPassword: z.string().min(12).max(128).optional()
});
