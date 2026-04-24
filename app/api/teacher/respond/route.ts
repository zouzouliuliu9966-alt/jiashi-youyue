import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireTeacher } from '@/lib/auth-helpers'

export async function POST(req: Request) {
  const { matchId, response, paymentAmount } = await req.json()
  if (!matchId || !response) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 })
  }

  const { data: match, error: matchErr } = await supabaseAdmin
    .from('matches')
    .select('id, teacher_id')
    .eq('id', matchId)
    .single()

  if (matchErr || !match) {
    return NextResponse.json({ error: '匹配记录不存在' }, { status: 404 })
  }

  const unauth = await requireTeacher(req, match.teacher_id)
  if (unauth) return unauth

  const updateData: Record<string, unknown> = { teacher_response: response }
  if (response === 'accepted' && paymentAmount) {
    updateData.payment_amount = paymentAmount
  }

  const { error } = await supabaseAdmin.from('matches').update(updateData).eq('id', matchId)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
