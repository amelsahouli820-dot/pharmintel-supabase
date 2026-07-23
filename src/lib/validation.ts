import { z } from "zod";

export const loginSchema = z.object({ email: z.string().email().max(254).transform(v => v.toLowerCase().trim()), password: z.string().min(8).max(128) });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(8).max(128), newPassword: z.string().min(12).max(128).regex(/[A-Z]/, "Une majuscule est requise").regex(/[a-z]/, "Une minuscule est requise").regex(/[0-9]/, "Un chiffre est requis").regex(/[^A-Za-z0-9]/, "Un caractère spécial est requis") });
export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100), email: z.string().email().max(254).transform(v => v.toLowerCase().trim()),
  role: z.enum(["ADMIN", "USER"]).default("USER"), temporaryPassword: z.string().min(12).max(128),
  permissions: z.object({ canImport: z.boolean(), canUseAI: z.boolean(), canExport: z.boolean() }).default({ canImport: true, canUseAI: true, canExport: true })
});
export const documentMetadataSchema = z.object({
  wholesaler: z.string().trim().min(1, "Sélectionnez un grossiste").max(150),
  customWholesaler: z.string().trim().max(150).optional().default(""),
  documentType: z.enum(["FLASH_SALE","RESTOCK","COMMERCIAL_PROPOSAL","QUOTA","PROMOTION","CONVENTION","REBATE","EXCEPTIONAL_DISCOUNT","PRICING","CATALOG","STOCKOUT","PRODUCT_LAUNCH","COMMERCIAL_COMMUNICATION","LAB_INFORMATION","LETTER","EMAIL","OTHER"]),
  customDocumentType: z.string().trim().max(150).optional().default(""),
  documentDate: z.string().optional().default(""), receivedAt: z.string().optional().default(""),
  region: z.string().trim().max(150).optional().default(""), laboratory: z.string().trim().max(200).optional().default(""),
  comments: z.string().trim().max(3000).optional().default(""),
  confidentiality: z.enum(["INTERNAL","CONFIDENTIAL","HIGHLY_CONFIDENTIAL"]).default("INTERNAL"),
  priority: z.enum(["LOW","NORMAL","HIGH","URGENT"]).default("NORMAL")
}).superRefine((value, ctx) => {
  if (value.wholesaler === "OTHER" && !value.customWholesaler) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["customWholesaler"], message: "Précisez le grossiste" });
  if (value.documentType === "OTHER" && !value.customDocumentType) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["customDocumentType"], message: "Précisez le type de document" });
});

export const registrationSchema = z.object({
  name: z.string().trim().min(2, "Le nom est trop court").max(100),
  email: z.string().email("Adresse e-mail invalide").max(254).transform(v => v.toLowerCase().trim())
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(), role: z.enum(["ADMIN", "USER"]).optional(), status: z.enum(["PENDING", "ACTIVE", "SUSPENDED"]).optional(),
  permissions: z.object({ canImport: z.boolean(), canUseAI: z.boolean(), canExport: z.boolean() }).optional(), temporaryPassword: z.string().min(12).max(128).optional()
});
