import { z } from "zod";

export const loginSchema = z.object({ email: z.string().email().max(254).transform(v => v.toLowerCase().trim()), password: z.string().min(8).max(128) });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(8).max(128), newPassword: z.string().min(12).max(128).regex(/[A-Z]/, "Une majuscule est requise").regex(/[a-z]/, "Une minuscule est requise").regex(/[0-9]/, "Un chiffre est requis").regex(/[^A-Za-z0-9]/, "Un caractère spécial est requis") });
export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100), email: z.string().email().max(254).transform(v => v.toLowerCase().trim()), phone:z.string().trim().max(30).optional().default(""),
  role: z.enum(["ADMIN", "DIRECTOR_GENERAL", "SUPERVISOR", "DELEGATE"]).default("DELEGATE"), temporaryPassword: z.string().min(12).max(128),
  supervisorId: z.string().cuid().nullable().optional(), region: z.enum(["EST","OUEST","CENTRE","SUD"]).nullable().optional(), wilaya: z.string().trim().max(100).nullable().optional(),
  permissions: z.object({ canImport: z.boolean(), canUseAI: z.boolean(), canExport: z.boolean(), canEditOwn: z.boolean().optional(), canDeleteOwn: z.boolean().optional() }).default({ canImport: true, canUseAI: true, canExport: true, canEditOwn: true, canDeleteOwn: false })
});
export const documentMetadataSchema = z.object({
  wholesaler: z.string().trim().min(1, "Sélectionnez un grossiste").max(150),
  customWholesaler: z.string().trim().max(150).optional().default(""),
  documentType: z.enum(["FLASH_SALE","RESTOCK","COMMERCIAL_PROPOSAL","QUOTA","PROMOTION","CONVENTION","REBATE","EXCEPTIONAL_DISCOUNT","PRICING","CATALOG","STOCKOUT","PRODUCT_LAUNCH","COMMERCIAL_COMMUNICATION","LAB_INFORMATION","LETTER","EMAIL","OTHER"]),
  customDocumentType: z.string().trim().max(150).optional().default(""),
  documentDate: z.string().optional().default(""), receivedAt: z.string().optional().default(""),
  region: z.string().trim().max(150).optional().default(""), wilaya: z.string().trim().max(100).optional().default(""), laboratory: z.string().trim().max(200).optional().default(""),
  comments: z.string().trim().max(3000).optional().default(""),
  confidentiality: z.enum(["INTERNAL","CONFIDENTIAL","HIGHLY_CONFIDENTIAL"]).default("INTERNAL"),
  priority: z.enum(["LOW","NORMAL","HIGH","URGENT"]).default("NORMAL")
}).superRefine((value, ctx) => {
  if (value.wholesaler === "OTHER" && !value.customWholesaler) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["customWholesaler"], message: "Précisez le grossiste" });
  if (value.documentType === "OTHER" && !value.customDocumentType) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["customDocumentType"], message: "Précisez le type de document" });
});

export const documentUpdateSchema = z.object({
  wholesaler: z.string().trim().min(1).max(150).optional(), documentType: z.enum(["FLASH_SALE","RESTOCK","COMMERCIAL_PROPOSAL","QUOTA","PROMOTION","CONVENTION","REBATE","EXCEPTIONAL_DISCOUNT","PRICING","CATALOG","STOCKOUT","PRODUCT_LAUNCH","COMMERCIAL_COMMUNICATION","LAB_INFORMATION","LETTER","EMAIL","OTHER"]).optional(),
  customDocumentType: z.string().trim().max(150).nullable().optional(), documentDate: z.string().nullable().optional(), receivedAt: z.string().nullable().optional(),
  region: z.string().trim().max(150).nullable().optional(), laboratory: z.string().trim().max(200).nullable().optional(), comments: z.string().trim().max(3000).nullable().optional(),
  confidentiality: z.enum(["INTERNAL","CONFIDENTIAL","HIGHLY_CONFIDENTIAL"]).optional(), priority: z.enum(["LOW","NORMAL","HIGH","URGENT"]).optional()
});

export const registrationSchema = z.object({
  firstName: z.string().trim().min(2,"Le prénom est requis").max(60), lastName:z.string().trim().min(2,"Le nom est requis").max(60),
  jobTitle:z.string().trim().min(2,"La fonction est requise").max(120), service:z.string().trim().max(120).optional().default(""),
  region:z.enum(["EST","OUEST","CENTRE","SUD"]), wilaya:z.string().trim().min(2,"La wilaya est requise").max(100),
  email: z.string().email("Adresse professionnelle invalide").max(254).transform(v => v.toLowerCase().trim()),
  personalEmail:z.union([z.string().email("Adresse personnelle invalide").max(254),z.literal("")]).optional().default(""),
  phone:z.string().trim().min(6,"Le téléphone professionnel est requis").max(30), personalPhone:z.string().trim().max(30).optional().default(""),
  messagingApps:z.array(z.enum(["WHATSAPP","VIBER","TELEGRAM","SMS"])).default([]),
  notificationPreferences:z.object({professionalEmail:z.boolean(),personalEmail:z.boolean(),whatsapp:z.boolean(),viber:z.boolean(),telegram:z.boolean(),sms:z.boolean()}),
  urgentAlerts:z.boolean().default(false)
});

export const profileUpdateSchema = registrationSchema.omit({urgentAlerts:true}).extend({urgentAlerts:z.boolean(),service:z.string().trim().max(120).optional().default("")});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(), firstName:z.string().trim().min(2).max(60).optional(),lastName:z.string().trim().min(2).max(60).optional(),jobTitle:z.string().trim().max(120).nullable().optional(),service:z.string().trim().max(120).nullable().optional(), email:z.string().email().max(254).transform(v=>v.toLowerCase().trim()).optional(),personalEmail:z.union([z.string().email().max(254),z.literal(""),z.null()]).optional(), phone:z.string().trim().max(30).nullable().optional(),personalPhone:z.string().trim().max(30).nullable().optional(), role: z.enum(["ADMIN", "DIRECTOR_GENERAL", "SUPERVISOR", "DELEGATE"]).optional(), status: z.enum(["PENDING", "ACTIVE", "INACTIVE", "SUSPENDED", "REFUSED", "ARCHIVED", "DELETED"]).optional(), supervisorId: z.string().cuid().nullable().optional(), region: z.enum(["EST","OUEST","CENTRE","SUD"]).nullable().optional(), wilaya: z.string().trim().max(100).nullable().optional(),
  permissions: z.object({ canImport: z.boolean(), canUseAI: z.boolean(), canExport: z.boolean(),canEditOwn:z.boolean().optional(),canDeleteOwn:z.boolean().optional() }).optional(), temporaryPassword: z.string().min(12).max(128).optional()
});
