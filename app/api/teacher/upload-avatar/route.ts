import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireTeacher } from '@/lib/auth-helpers'

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('file') as File
  const teacherId = formData.get('teacherId') as string

  if (!file || !teacherId) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 })
  }

  const unauth = await requireTeacher(req, teacherId)
  if (unauth) return unauth

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
