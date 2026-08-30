import { createError } from 'h3'
import { db } from '~~/server/database'
import { auth } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/api-response'
import { putR2Object } from '~~/server/utils/r2'

function extFromType(type = '') {
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  return 'jpg'
}

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const files = await readMultipartFormData(event)
  const image = files?.find((item) => item.name === 'profileImage')

  if (!image?.data?.length) {
    throw createError({ statusCode: 400, statusMessage: 'File gambar wajib diunggah' })
  }

  if (!image.type?.startsWith('image/')) {
    throw createError({ statusCode: 400, statusMessage: 'File harus berupa gambar' })
  }

  if (image.data.length > 5 * 1024 * 1024) {
    throw createError({ statusCode: 400, statusMessage: 'Ukuran gambar maksimal 5MB' })
  }

  const key = `profiles/${session.user.id}-${Date.now()}.${extFromType(image.type)}`
  const imageUrl = await putR2Object({
    key,
    body: Buffer.from(image.data),
    contentType: image.type || 'image/jpeg',
  })

  await db.user.update({
    where: { id: session.user.id },
    data: { image: imageUrl },
  })

  return ok({ image: imageUrl })
})
