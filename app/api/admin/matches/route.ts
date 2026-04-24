import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/auth-helpers'

// POST /api/admin/matches —— 创建匹配（推送给老师）
export async function POST(req: Request) {
  const unauth = requireAdmin(req)
  if (unauth) return unauth

  const { booking_id, teacher_id } = await req.json()
  if (!booking_id || !teacher_id) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 })
  }

  // 避免重复匹配
  const { data: existing } = await supabaseAdmin
    .from('matches')
    .select('id')
    .eq('booking_id', booking_id)
    .eq('teacher_id', teacher_id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ success: true, duplicate: true })
  }

  const { error: insertErr } = await supabaseAdmin
    .from('matches')
    .insert({ booking_id, teacher_id })

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  const { error: updateErr } = await supabaseAdmin
    .from('bookings')
    .update({ status: 'sent' })
    .eq('id', booking_id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
