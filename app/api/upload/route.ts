import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file   = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'uploads'

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Only images allowed' }, { status: 400 })
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Max 10MB' }, { status: 400 })

    const raw = Buffer.from(await file.arrayBuffer())

    // Resize to max 400×400, convert to WebP at quality 75 → typically 20-80KB
    const compressed = await sharp(raw)
      .resize(400, 400, { fit: 'cover', position: 'face' })
      .webp({ quality: 75 })
      .toBuffer()

    const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`

    await r2.send(new PutObjectCommand({
      Bucket:      process.env.R2_BUCKET_NAME!,
      Key:         key,
      Body:        compressed,
      ContentType: 'image/webp',
    }))

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`
    return NextResponse.json({ url: publicUrl })
  } catch (err: any) {
    console.error('R2 upload error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
