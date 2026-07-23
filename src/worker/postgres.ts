import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { markFinalFailure, processDocument } from "./processor";

type ClaimedJob = { id: string; documentId: string; attempts: number };
let stopping = false;
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function claimJob(): Promise<ClaimedJob | null> {
  return db.$transaction(async tx => {
    const rows = await tx.$queryRaw<ClaimedJob[]>(Prisma.sql`
      SELECT id, "documentId", attempts
      FROM processing_jobs
      WHERE status = 'QUEUED'::"ProcessingJobStatus"
         OR (status = 'RUNNING'::"ProcessingJobStatus" AND "lockedAt" < NOW() - INTERVAL '15 minutes')
      ORDER BY "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `);
    const job = rows[0];
    if (!job) return null;
    await tx.processingJob.update({ where: { id: job.id }, data: { status: "RUNNING", lockedAt: new Date(), attempts: { increment: 1 }, errorMessage: null } });
    return { ...job, attempts: job.attempts + 1 };
  });
}

async function run() {
  console.log("[worker-postgres] file Supabase prête");
  while (!stopping) {
    let job: ClaimedJob | null = null;
    try {
      job = await claimJob();
      if (!job) { await pause(3000); continue; }
      await processDocument(job.documentId);
      await db.processingJob.update({ where: { id: job.id }, data: { status: "COMPLETED", lockedAt: null, errorMessage: null } });
      console.log(`[worker-postgres] document ${job.documentId} analysé`);
    } catch (value) {
      const error = value instanceof Error ? value : new Error(String(value));
      console.error(`[worker-postgres] ${error.message}`);
      if (job) {
        if (job.attempts < 3) {
          await db.$transaction([
            db.processingJob.update({ where: { id: job.id }, data: { status: "QUEUED", lockedAt: null, errorMessage: error.message.slice(0, 1000) } }),
            db.document.update({ where: { id: job.documentId }, data: { status: "PENDING", errorMessage: `Nouvelle tentative ${job.attempts}/3` } })
          ]).catch(() => undefined);
          await pause(5000 * job.attempts);
        } else {
          await db.processingJob.update({ where: { id: job.id }, data: { status: "FAILED", lockedAt: null, errorMessage: error.message.slice(0, 1000) } }).catch(() => undefined);
          await markFinalFailure(job.documentId, error);
        }
      } else await pause(5000);
    }
  }
}

async function shutdown() { stopping = true; await db.$disconnect(); process.exit(0); }
process.on("SIGTERM", shutdown); process.on("SIGINT", shutdown);
run().catch(async error => { console.error(error); await db.$disconnect(); process.exit(1); });
