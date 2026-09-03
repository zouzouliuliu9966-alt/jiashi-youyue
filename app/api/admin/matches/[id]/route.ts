import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/auth-helpers'

// PATCH /api/admin/matches/[id]
//   confirm_payment —— 确认收到信息费：payment_confirmed=true + booking.status='matched'
//                      同时把 fee_status 置为 'pending'（待核销）
//   clear_fee       —— 核销：这一单确实开课了，这笔信息费算平台的
//   refund_fee      —— 退款：不成单，钱已退回老师
//
// 🔴 「待核销」只是账面状态。收款走个人码，钱在老师扫码那刻就到账了，
//    平台没有任何冻结能力。对老师的措辞只能是「不成单秒退」，不能说「托管」。
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauth = requireAdmin(req)
  if (unauth) return unauth

  const { id } = await params
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: '请求格式不正确' }, { status: 400 })
  }
  const { action, note } = body as { action?: string; note?: unknown }

  const ACTIONS = ['confirm_payment', 'clear_fee', 'refund_fee']
  if (typeof action !== 'string' || !ACTIONS.includes(action)) {
    return NextResponse.json({ error: '不支持的操作' }, { status: 400 })
  }
  if (note != null && (typeof note !== 'string' || note.length > 200)) {
    return NextResponse.json({ error: '说明格式不正确或过长' }, { status: 400 })
  }

  const { data: match, error: readErr } = await supabaseAdmin
    .from('matches')
    // 用 * 而不是逐列点名：fee_status 等列是后加的，SQL 还没执行时
    // 点名查会整条失败 → 确认收款直接 404，把主链路打断。
    .select('*')
    .eq('id', id)
    .single()

  if (readErr || !match) {
    return NextResponse.json({ error: '匹配记录不存在' }, { status: 404 })
  }

  const now = new Date().toISOString()

  if (action === 'confirm_payment') {
    // 只有老师真的接了单才谈得上收信息费。不校验的话，
    // pending/declined 的匹配也能被确认收款，还会把 booking 改成 matched。
    if (match.teacher_response !== 'accepted') {
      return NextResponse.json({ error: '这位老师还没接单，不能确认收款' }, { status: 400 })
    }
    if (match.payment_confirmed) {
      return NextResponse.json({ error: '已确认收款，不能重复' }, { status: 400 })
    }
    // 带前置条件的 UPDATE：并发点两次时第二次影响 0 行，不会重复放行。
    // fee_status 列可能还没建（fee_clearing.sql 未执行），那就退回只更新 payment_confirmed ——
    // 确认收款是主链路，不能因为核销这个后加的功能而挂掉。
    const doUpdate = (withFee: boolean) => supabaseAdmin
      .from('matches')
      .update(withFee ? { payment_confirmed: true, fee_status: 'pending' } : { payment_confirmed: true })
      .eq('id', id)
      .eq('payment_confirmed', false)
      .select('id')

    let { data: updated, error: mErr } = await doUpdate(true)
    // 只对「列不存在」这一种错误降级，而且必须错误信息确实指向 fee_status。
    // 光按文本匹配会把任何提到 fee_status 的 CHECK / 触发器错误一起吞掉，
    // 第二次 UPDATE 反而绕过了本该拒绝这次操作的数据库规则。
    const isMissingColumn = !!mErr
      && (mErr.code === 'PGRST204' || mErr.code === '42703')
      && /fee_status/.test(`${mErr.message} ${mErr.details ?? ''}`)
    if (isMissingColumn) {
      console.error('[matches] fee_status 列不存在，本次确认收款不记核销状态。请执行 supabase/fee_clearing.sql')
      ;({ data: updated, error: mErr } = await doUpdate(false))
    }
    if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 })
    if (!updated?.length) {
      return NextResponse.json({ error: '已确认收款，不能重复' }, { status: 400 })
    }

    const { error: bErr } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'matched' })
      .eq('id', match.booking_id)
    if (bErr) {
      // 两步不在一个事务里。第二步失败就把第一步回滚掉 ——
      // 否则 match 已进入待核销、booking 还停在旧状态，
      // 而重试又会被「已确认收款」拦住，这个半完成状态永远修不回来。
      const { error: revertErr } = await supabaseAdmin
        .from('matches')
        .update({ payment_confirmed: false, fee_status: null })
        .eq('id', id)
      if (revertErr) {
        console.error('[matches] 回滚确认收款失败，出现半完成状态:', id, revertErr.message)
        return NextResponse.json(
          { error: '确认收款出错且回滚失败，请联系技术处理（匹配 id：' + id + '）' },
          { status: 500 },
        )
      }
      return NextResponse.json({ error: '确认收款失败，请重试：' + bErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  // 核销与退款都只能从「已确认收款 + 待核销」出发。
  // 只看 fee_status 不够：万一出现 payment_confirmed=false 却带着 pending 的脏数据，
  // 就会把一笔根本没收到的钱「核销」或「退」出去。
  if (!match.payment_confirmed) {
    return NextResponse.json({ error: '还没确认收款，不能核销或退款' }, { status: 400 })
  }
  // null 也算待核销（历史数据、或列刚加上还没回填），要跟后台列表的口径一致，
  // 否则那些行在列表里看得见却点不动。
  if (match.fee_status === undefined) {
    return NextResponse.json(
      { error: '核销功能尚未启用：请先在 Supabase 执行 supabase/fee_clearing.sql' },
      { status: 400 },
    )
  }
  if (match.fee_status !== 'pending' && match.fee_status !== null) {
    return NextResponse.json({ error: '这笔信息费已经处理过了' }, { status: 400 })
  }

  const isRefund = action === 'refund_fee'
  const { data: updated, error } = await supabaseAdmin
    .from('matches')
    .update({
      fee_status: isRefund ? 'refunded' : 'cleared',
      [isRefund ? 'fee_refunded_at' : 'fee_cleared_at']: now,
      fee_note: typeof note === 'string' && note.trim() ? note.trim() : null,
    })
    .eq('id', id)
    .or('fee_status.eq.pending,fee_status.is.null')
    .eq('payment_confirmed', true)   // 同上，防并发重复处理
    .select('id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!updated?.length) {
    return NextResponse.json({ error: '这笔信息费已经处理过了' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
