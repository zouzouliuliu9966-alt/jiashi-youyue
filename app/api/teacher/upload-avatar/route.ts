import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('file') as File
  const teacherId = formData.get('teacherId') as string

  if (!file || !teacherId) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()
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
