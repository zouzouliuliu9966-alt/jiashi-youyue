import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireTeacher } from '@/lib/auth-helpers'
import { notifyWecom, teacherPaidMessage } from '@/lib/notify'

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

  // 老师接单=已付信息费，要教务尽快确认收款，否则老师干等着看不到家长联系方式
  if (response === 'accepted') {
    const { data: info } = await supabaseAdmin
      .from('matches')
      .select('payment_amount, teachers(name), bookings(student_grade)')
      .eq('id', matchId)
      .single()
    const t = info?.teachers as { name?: string } | null
    const b = info?.bookings as { student_grade?: string } | null
    await notifyWecom(teacherPaidMessage({
      teacher_name: t?.name,
      amount: info?.payment_amount,
      student_grade: b?.student_grade,
    }))
  }

  return NextResponse.json({ success: true })
}
