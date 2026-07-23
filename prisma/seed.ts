import { PrismaClient, Role, UserStatus, OfferType, DocumentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@pharmintel.dz").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "ChangeMe!2026";
  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: Role.ADMIN, status: UserStatus.ACTIVE },
    create: {
      name: process.env.ADMIN_NAME || "Administrateur",
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      mustChangePassword: true,
      permissions: { canImport: true, canUseAI: true, canExport: true }
    }
  });

  if (process.env.SEED_DEMO === "true") {
    const doc = await prisma.document.create({ data: {
      userId: admin.id, originalName: "offres-juillet.xlsx", storageKey: `demo/${Date.now()}.xlsx`,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: 18420,
      sha256: "demo", status: DocumentStatus.COMPLETED, processedAt: new Date()
    }});
    const samples = [
      ["Pharma Distribution Est", "Saidal", "Paracétamol 500 mg", 185, OfferType.PROMOTION, 18, "Sétif"],
      ["Alliance Santé", "Biopharm", "Vitamine D3", 410, OfferType.FLASH_SALE, 32, "Alger"],
      ["Hygie Distribution", "El Kendi", "Amoxicilline 1 g", 620, OfferType.RESTOCK, null, "Constantine"],
      ["Pharma Distribution Est", "Sanofi", "Doliprane 1000 mg", 295, OfferType.DISCOUNT, 27, "Sétif"]
    ] as const;
    for (const [wholesaler, laboratory, product, price, offerType, discount, wilaya] of samples) {
      await prisma.intelligenceRecord.create({ data: {
        documentId: doc.id, userId: admin.id, observedAt: new Date(), wholesaler, laboratory, product,
        price, offerType, discountPercent: discount, wilaya, region: "Est", confidence: 0.94,
        rawExtraction: { source: "demo" }
      }});
    }
  }
  console.log(`Administrateur prêt : ${email}`);
}

main().finally(() => prisma.$disconnect());
