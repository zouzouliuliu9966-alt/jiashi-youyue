import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireTeacher } from '@/lib/auth-helpers'
import { notifyWecomText, teacherPaidMessage } from '@/lib/notify'

export async function POST(req: Request) {
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '请求格式不正确' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: '请求格式不正确' }, { status: 400 })
  }
  const { matchId, response, paymentAmount } = body
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

  // response 必须是枚举，且只能从 pending 出发。
  // 不限制的话，老师能把已付款/已核销的记录改成 declined，
  // 费用状态和家长联系方式就从他自己的页面上消失了（钱却已经收了）。
  if (response !== 'accepted' && response !== 'declined') {
    return NextResponse.json({ error: '无效的操作' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = { teacher_response: response }
  if (response === 'accepted' && paymentAmount) {
    updateData.payment_amount = paymentAmount
  }

  // Supabase 对零行 UPDATE 不报错。不看命中行数的话：
  // ① 重复点「接单」会再推一条企微通知；② accepted/declined 并发时败方也返回成功，
  // 前端把本地状态改成自己提交的值，跟数据库相反。
  const { data: changed, error } = await supabaseAdmin
    .from('matches')
    .update(updateData)
    .eq('id', matchId)
    .eq('teacher_response', 'pending')
    .select('id')
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  if (!changed?.length) {
    // 已经处理过了。相同结果的重试按幂等成功返回，但绝不重复副作用（不再推通知）
    const { data: cur } = await supabaseAdmin
      .from('matches').select('teacher_response').eq('id', matchId).single()
    if (cur?.teacher_response === response) {
      return NextResponse.json({ success: true, alreadyDone: true })
    }
    return NextResponse.json({ error: '这条需求已经处理过了，请刷新查看' }, { status: 409 })
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
    await notifyWecomText(teacherPaidMessage({
      teacher_name: t?.name,
      amount: info?.payment_amount,
      student_grade: b?.student_grade,
    }))
  }

  return NextResponse.json({ success: true })
}
