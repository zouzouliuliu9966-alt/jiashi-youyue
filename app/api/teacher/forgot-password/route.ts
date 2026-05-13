import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  const { contact } = await req.json()
  if (!contact || typeof contact !== 'string') {
    return NextResponse.json({ error: '请填写手机号或邮箱' }, { status: 400 })
  }

  const trimmed = contact.trim()
  const isPhone = /^\d{11}$/.test(trimmed)
  const lookupEmail = isPhone ? `${trimmed}@phone.jiashiyouyue.cn` : trimmed

  const { data: teacher } = await supabaseAdmin
    .from('teachers')
    .select('id, name, email')
    .eq('email', lookupEmail)
    .single()

  if (!teacher) {
    return NextResponse.json({ error: '未找到该账号，请确认手机号或邮箱是否正确' }, { status: 404 })
  }

  const { data: pending } = await supabaseAdmin
    .from('password_reset_requests')
    .select('id')
    .eq('teacher_id', teacher.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (pending) {
    return NextResponse.json({ success: true, alreadyPending: true })
  }

  const { error: insertErr } = await supabaseAdmin
    .from('password_reset_requests')
    .insert({
      teacher_id: teacher.id,
      contact: trimmed,
      contact_type: isPhone ? 'phone' : 'email',
    })

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
