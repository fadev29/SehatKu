import { createHash, createHmac } from 'node:crypto'

function sha256(value: string | Buffer) {
  return createHash('sha256').update(value).digest('hex')
}

function hmac(key: Buffer | string, value: string) {
  return createHmac('sha256', key).update(value).digest()
}

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucketName = process.env.R2_BUCKET_NAME
  const publicUrl = process.env.R2_PUBLIC_URL

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Konfigurasi Cloudflare R2 belum lengkap' })
  }

  return { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl }
}

export async function putR2Object(input: { key: string, body: Buffer, contentType: string }) {
  const { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl } = getR2Config()
  const host = `${accountId}.r2.cloudflarestorage.com`
  const path = `/${bucketName}/${input.key}`
  const url = `https://${host}${path}`
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)
  const payloadHash = sha256(input.body)
  const canonicalHeaders = `content-type:${input.contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date'
  const canonicalRequest = ['PUT', path, '', canonicalHeaders, signedHeaders, payloadHash].join('\n')
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256(canonicalRequest)].join('\n')
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp)
  const kRegion = hmac(kDate, 'auto')
  const kService = hmac(kRegion, 's3')
  const kSigning = hmac(kService, 'aws4_request')
  const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex')
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'content-type': input.contentType,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      authorization,
    },
    body: input.body,
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw createError({ statusCode: 502, statusMessage: `Upload R2 gagal: ${message || response.statusText}` })
  }

  return `${publicUrl.replace(/\/$/, '')}/${input.key}`
}
