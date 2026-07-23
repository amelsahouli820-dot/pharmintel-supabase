import "server-only";
import { Queue } from "bullmq";

const connection = { url: process.env.REDIS_URL || "redis://localhost:6379" };
declare global { var documentQueue: Queue | undefined; }
export function getDocumentQueue() {
  const queue = global.documentQueue ?? new Queue("document-analysis", { connection });
  if (process.env.NODE_ENV !== "production") global.documentQueue = queue;
  return queue;
}
