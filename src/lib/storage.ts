import { CreateBucketCommand, DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Readable } from "node:stream";

const driver = process.env.STORAGE_DRIVER || "s3";
const Bucket = process.env.SUPABASE_BUCKET || process.env.S3_BUCKET || "pharmintel-documents";
let supabase: SupabaseClient | null = null;
let bucketReady: Promise<void> | null = null;

function supabaseAdmin() {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL et SUPABASE_SECRET_KEY doivent être configurés");
  supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return supabase;
}

const rawEndpoint = process.env.S3_ENDPOINT;
const endpoint = rawEndpoint && !rawEndpoint.startsWith("http") ? `http://${rawEndpoint}` : rawEndpoint;
const accessKeyId = process.env.S3_ACCESS_KEY || process.env.MINIO_ROOT_USER;
const secretAccessKey = process.env.S3_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD;
const s3 = new S3Client({
  endpoint, region: process.env.S3_REGION || "eu-west-1",
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true" || Boolean(endpoint),
  credentials: accessKeyId ? { accessKeyId, secretAccessKey: secretAccessKey || "" } : undefined
});

async function ensureBucket() {
  if (driver === "supabase") {
    bucketReady ??= (async () => {
      const client = supabaseAdmin();
      const { data } = await client.storage.getBucket(Bucket);
      if (!data) {
        const { error } = await client.storage.createBucket(Bucket, { public: false, fileSizeLimit: (Number(process.env.MAX_UPLOAD_MB) || 25) * 1024 * 1024 });
        if (error && !error.message.toLowerCase().includes("already exists")) throw error;
      }
    })();
  } else if (endpoint) {
    bucketReady ??= (async () => {
      try { await s3.send(new HeadBucketCommand({ Bucket })); }
      catch { await s3.send(new CreateBucketCommand({ Bucket })); }
    })();
  } else return;
  try { await bucketReady; } catch (error) { bucketReady = null; throw error; }
}

export async function putFile(key: string, body: Buffer, contentType: string) {
  await ensureBucket();
  if (driver === "supabase") {
    const { error } = await supabaseAdmin().storage.from(Bucket).upload(key, body, { contentType, upsert: false });
    if (error) throw error;
    return;
  }
  await s3.send(new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: contentType, ServerSideEncryption: endpoint ? undefined : "AES256" }));
}

export async function getFile(key: string) {
  await ensureBucket();
  if (driver === "supabase") {
    const { data, error } = await supabaseAdmin().storage.from(Bucket).download(key);
    if (error || !data) throw error || new Error("Fichier introuvable dans Supabase Storage");
    return Buffer.from(await data.arrayBuffer());
  }
  const response = await s3.send(new GetObjectCommand({ Bucket, Key: key }));
  if (!response.Body) throw new Error("Fichier introuvable dans le stockage objet");
  const chunks: Buffer[] = [];
  for await (const chunk of response.Body as Readable) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export async function deleteFile(key: string) {
  await ensureBucket();
  if (driver === "supabase") {
    const { error } = await supabaseAdmin().storage.from(Bucket).remove([key]);
    if (error) throw error;
    return;
  }
  await s3.send(new DeleteObjectCommand({ Bucket, Key: key }));
}
