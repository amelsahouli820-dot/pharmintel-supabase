import { Worker } from "bullmq";
import { db } from "@/lib/db";
import { markFinalFailure, processDocument } from "./processor";

const connection = { url: process.env.REDIS_URL || "redis://localhost:6379" };
const worker = new Worker("document-analysis", async job => processDocument(job.data.documentId), { connection, concurrency: Number(process.env.WORKER_CONCURRENCY) || 3, lockDuration: 180_000 });
worker.on("completed", job => console.log(`[worker] document ${job.id} analysé`));
worker.on("failed", async (job, error) => {
  console.error(`[worker] échec ${job?.id}:`, error.message);
  if (job?.data.documentId && job.attemptsMade >= (job.opts.attempts || 1)) await markFinalFailure(job.data.documentId, error);
});
async function shutdown() { await worker.close(); await db.$disconnect(); process.exit(0); }
process.on("SIGTERM", shutdown); process.on("SIGINT", shutdown);
console.log("[worker] file Redis PharmIntel prête");
