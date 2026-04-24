import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/auth-helpers'

// PATCH /api/admin/matches/[id] —— 确认付款：match.payment_confirmed=true + booking.status='matched'
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauth = requireAdmin(req)
  if (unauth) return unauth

  const { id } = await params
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  if (body.action !== 'confirm_payment') {
    return NextResponse.json({ error: '不支持的操作' }, { status: 400 })
  }

  const { data: match, error: readErr } = await supabaseAdmin
    .from('matches')
    .select('id, booking_id, payment_confirmed')
    .eq('id', id)
    .single()

  if (readErr || !match) {
    return NextResponse.json({ error: '匹配记录不存在' }, { status: 404 })
  }

  if (match.payment_confirmed) {
    return NextResponse.json({ error: '已确认付款，不能重复' }, { status: 400 })
  }

  const { error: mErr } = await supabaseAdmin
    .from('matches')
    .update({ payment_confirmed: true })
    .eq('id', id)
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 })

  const { error: bErr } = await supabaseAdmin
    .from('bookings')
    .update({ status: 'matched' })
    .eq('id', match.booking_id)
  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
