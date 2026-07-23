import type { Prisma, Role } from "@prisma/client";

type Actor = { id: string; role: Role };
export function hasGlobalVision(user: Actor) { return user.role === "ADMIN" || user.role === "DIRECTOR_GENERAL"; }
export function canManageUsers(user: Actor) { return user.role === "ADMIN"; }
export function canViewAudit(user: Actor) { return user.role === "ADMIN"; }
export function canValidateDocuments(user: Actor) { return user.role === "ADMIN" || user.role === "SUPERVISOR"; }
export function canImportDocuments(user: Actor) { return user.role === "ADMIN" || user.role === "DELEGATE"; }
export function canEditDocument(user: Actor, ownerId: string) { return user.role === "ADMIN" || (user.role === "DELEGATE" && user.id === ownerId); }
export function canDeleteDocument(user: Actor, ownerId: string, explicitPermission = true) { return user.role === "ADMIN" || (user.role === "DELEGATE" && user.id === ownerId && explicitPermission); }
export function documentScope(user: Actor): Prisma.DocumentWhereInput {
  if (hasGlobalVision(user)) return {};
  if (user.role === "SUPERVISOR") return { OR: [{ userId: user.id }, { user: { supervisorId: user.id } }] };
  return { userId: user.id };
}
export function recordScope(user: Actor): Prisma.IntelligenceRecordWhereInput {
  if (hasGlobalVision(user)) return {};
  if (user.role === "SUPERVISOR") return { OR: [{ userId: user.id }, { user: { supervisorId: user.id } }] };
  return { userId: user.id };
}
export function roleLabel(role: Role) {
  return ({ ADMIN:"Administrateur", DIRECTOR_GENERAL:"Directeur Général", SUPERVISOR:"Superviseur", DELEGATE:"Délégué" } as Record<Role,string>)[role];
}
