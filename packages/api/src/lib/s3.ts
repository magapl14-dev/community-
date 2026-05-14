import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from './env.js'

let client: S3Client | null = null

function getClient(): S3Client {
  if (client) return client
  if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY || !env.S3_REGION) {
    throw new Error('S3 is not configured (S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_REGION)')
  }
  client = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
    forcePathStyle: true,
  })
  return client
}

function bucket(): string {
  if (!env.S3_BUCKET) throw new Error('S3_BUCKET is not set')
  return env.S3_BUCKET
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<string> {
  await getClient().send(
    new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType }),
  )
  // Публичный URL (для приватных файлов — использовать presigned)
  return `${env.S3_ENDPOINT}/${bucket()}/${key}`
}

export async function presignedDownloadUrl(key: string, ttlSec = 3600): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: bucket(), Key: key })
  return getSignedUrl(getClient(), cmd, { expiresIn: ttlSec })
}
