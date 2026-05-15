import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ulid } from 'ulid';
import { config } from '../config.js';

export const s3 = new S3Client({
  endpoint: config.S3_ENDPOINT,
  region: config.S3_REGION,
  forcePathStyle: config.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: config.S3_ACCESS_KEY,
    secretAccessKey: config.S3_SECRET_KEY,
  },
});

export function buildImageKey(tenantId: string, treeId: string, contentType: string) {
  const ext = contentType.split('/')[1] ?? 'bin';
  return `${tenantId}/trees/${treeId}/${ulid()}.${ext.toLowerCase()}`;
}

export async function presignUpload(args: { key: string; contentType: string; ttlSeconds?: number }) {
  const cmd = new PutObjectCommand({
    Bucket: config.S3_BUCKET,
    Key: args.key,
    ContentType: args.contentType,
  });
  return getSignedUrl(s3, cmd, { expiresIn: args.ttlSeconds ?? 600 });
}

export async function presignDownload(args: { key: string; ttlSeconds?: number }) {
  const cmd = new GetObjectCommand({
    Bucket: config.S3_BUCKET,
    Key: args.key,
  });
  return getSignedUrl(s3, cmd, { expiresIn: args.ttlSeconds ?? 600 });
}
