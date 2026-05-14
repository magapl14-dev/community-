import type { FastifyInstance } from 'fastify'
import sharp from 'sharp'
import crypto from 'node:crypto'
import { prisma } from '../lib/db.js'
import { putObject } from '../lib/s3.js'
import { ApiError } from '../lib/errors.js'

const MAX_BYTES = 5 * 1024 * 1024 // 5MB
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
])

export async function uploadRoutes(app: FastifyInstance) {
  // POST /upload/avatar — multipart, 1 file, авто-конвертация HEIC→JPEG, ресайз 400×400
  app.post('/avatar', { preHandler: [app.authenticate] }, async (req, reply) => {
    const file = await req.file()
    if (!file) throw new ApiError(400, 'no_file', 'Файл не загружен')
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new ApiError(400, 'invalid_mime', `Тип файла ${file.mimetype} не поддерживается`)
    }

    const buf = await file.toBuffer().catch((err: Error) => {
      if (err.message.includes('reached')) {
        throw new ApiError(413, 'file_too_large', `Файл больше ${MAX_BYTES / 1024 / 1024} MB`)
      }
      throw err
    })

    if (buf.length > MAX_BYTES) {
      throw new ApiError(413, 'file_too_large', `Файл больше ${MAX_BYTES / 1024 / 1024} MB`)
    }

    // Sharp обрабатывает HEIC при наличии libheif (поставляется в стандартных билдах)
    const processed = await sharp(buf, { failOn: 'truncated' })
      .rotate() // учесть EXIF orientation
      .resize(400, 400, { fit: 'cover' })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer()

    const userId = req.currentUser!.id
    const key = `avatars/${userId}/${crypto.randomUUID()}.jpg`
    const url = await putObject(key, processed, 'image/jpeg')

    await prisma.user.update({ where: { id: userId }, data: { avatarUrl: url } })
    return reply.send({ avatarUrl: url })
  })
}
