import { randomUUID } from 'crypto'
import sharp from 'sharp'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { s3, BUCKET, getObjectBuffer, putObject } from '@/lib/s3'
import { dhash } from '@/lib/hash'

const RASTER_IMAGE = /^image\/(jpeg|png|webp|gif|avif|tiff|bmp)$/
const THUMB_MAX_EDGE = 512
const THUMB_QUALITY = 78

export const isRasterImage = (mimeType: string): boolean => RASTER_IMAGE.test(mimeType)

export type ImageDerivatives = {
  width: number | null
  height: number | null
  thumbS3Key: string | null
  phash: string | null
}

const emptyDerivatives: ImageDerivatives = {
  width: null,
  height: null,
  thumbS3Key: null,
  phash: null,
}

/**
 * For raster images: download the original from S3, read its dimensions,
 * upload a webp thumbnail, and compute a perceptual hash.
 * Non-raster mimes (or unreadable images) yield empty derivatives.
 */
export const buildImageDerivatives = async (
  s3Key: string,
  mimeType: string
): Promise<ImageDerivatives> => {
  if (!isRasterImage(mimeType)) return emptyDerivatives
  try {
    const original = await getObjectBuffer(s3Key)
    const { width, height } = await readDimensions(original)
    const thumbS3Key = await uploadThumbnail(original)
    const phash = await dhash(original)
    return { width, height, thumbS3Key, phash }
  } catch {
    return emptyDerivatives
  }
}

const readDimensions = async (
  image: Buffer
): Promise<{ width: number | null; height: number | null }> => {
  const meta = await sharp(image).metadata()
  return { width: meta.width ?? null, height: meta.height ?? null }
}

const uploadThumbnail = async (original: Buffer): Promise<string> => {
  const thumb = await sharp(original)
    .resize(THUMB_MAX_EDGE, THUMB_MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY })
    .toBuffer()
  const key = `thumbs/${randomUUID()}.webp`
  await putObject(key, thumb, 'image/webp')
  return key
}

/** Presigned GET that forces a download with the original filename preserved. */
export const presignedDownloadUrl = (
  key: string,
  filename: string,
  expiresIn = 300
): Promise<string> =>
  getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ResponseContentDisposition: attachmentDisposition(filename),
    }),
    { expiresIn }
  )

const attachmentDisposition = (filename: string): string => {
  const asciiFallback = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
  const utf8Encoded = encodeURIComponent(filename)
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${utf8Encoded}`
}
