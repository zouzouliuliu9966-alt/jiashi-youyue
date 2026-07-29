import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireTeacher } from '@/lib/auth-helpers'

const MAX_BYTES = 5 * 1024 * 1024 // 5MB
// 只收常见图片格式。扩展名从这里取，不用文件名里的 —— 文件名可以是
// "x.php" 之类的任意字符串，直接拼进存储路径不安全
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
}

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('file') as File
  const teacherId = formData.get('teacherId') as string

  if (!file || !teacherId) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 })
  }

  const unauth = await requireTeacher(req, teacherId)
  if (unauth) return unauth

  const ext = ALLOWED[file.type]
  if (!ext) {
    return NextResponse.json(
      { error: '只支持 JPG / PNG / WebP / GIF / HEIC 图片' },
      { status: 400 },
    )
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `图片不能超过 ${MAX_BYTES / 1024 / 1024}MB，当前 ${(file.size / 1024 / 1024).toFixed(1)}MB` },
      { status: 400 },
    )
  }

  const path = `${teacherId}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage.from('avatars').upload(path, buffer, {
    upsert: true,
    contentType: file.type,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const { data } = supabaseAdmin.storage.from('avatars').getPublicUrl(path)

  return NextResponse.json({ url: data.publicUrl + '?t=' + Date.now() })
}
