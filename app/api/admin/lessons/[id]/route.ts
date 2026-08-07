import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/auth-helpers'
import { isDone } from '@/lib/lesson-status'

type Action = 'confirm_payment' | 'mark_completed' | 'parent_confirm' | 'settle'

// PATCH /api/admin/lessons/[id]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauth = requireAdmin(req)
  if (unauth) return unauth

  const { id } = await params
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const body = await req.json()
  const action: Action | undefined = body.action
  const notes: string | undefined = body.notes

  // 读出当前订单，用于后续状态校验和结算金额计算
  const { data: current, error: readErr } = await supabaseAdmin
    .from('lesson_orders')
    .select('lesson_status, payment_status, teacher_marked_at, parent_confirmed_at, settled, price_per_lesson, platform_rate')
    .eq('id', id)
    .single()

  if (readErr || !current) {
    return NextResponse.json({ error: '订单不存在' }, { status: 404 })
  }

  const update: Record<string, unknown> = {}
  const now = new Date().toISOString()
  // 状态流转必须带前置条件写回数据库，否则两个并发请求会同时通过上面的
  // 判断然后都写入（例如重复结算）。guard 里的条件会拼进 UPDATE 的 WHERE。
  const guard: Record<string, string | boolean> = {}

  if (action === 'confirm_payment') {
    if (current.payment_status === 'paid') {
      return NextResponse.json({ error: '已确认收款，无需重复操作' }, { status: 400 })
    }
    update.payment_status = 'paid'
    update.payment_confirmed_at = now
    guard.payment_status = 'pending'
  } else if (action === 'mark_completed') {
    if (current.payment_status !== 'paid') {
      return NextResponse.json({ error: '未付款的订单不能标记完课' }, { status: 400 })
    }
    if (isDone(current.lesson_status)) {
      return NextResponse.json({ error: '已完课，无需重复标记' }, { status: 400 })
    }
    // 只有「待上课」能标完课；已取消的订单不能被重新激活
    if (current.lesson_status !== 'pending') {
      return NextResponse.json({ error: '该订单状态不能标记完课' }, { status: 400 })
    }
    update.lesson_status = 'teacher_done'
    update.teacher_marked_at = now
    guard.lesson_status = 'pending'
    guard.payment_status = 'paid'
  } else if (action === 'parent_confirm') {
    // 按状态判断，不能只看 teacher_marked_at 这个历史时间戳
    if (current.lesson_status !== 'teacher_done') {
      return NextResponse.json(
        { error: current.parent_confirmed_at ? '已确认，无需重复操作' : '老师尚未标记完课' },
        { status: 400 },
      )
    }
    update.lesson_status = 'confirmed'
    update.parent_confirmed_at = now
    guard.lesson_status = 'teacher_done'
  } else if (action === 'settle') {
    if (!isDone(current.lesson_status)) {
      return NextResponse.json({ error: '未完课的订单不能结算' }, { status: 400 })
    }
    if (current.settled) {
      return NextResponse.json({ error: '已结算，不能重复结算' }, { status: 400 })
    }
    const price = Number(current.price_per_lesson)
    // 默认 0：平台只收接单信息费，不从课时费里抽点
    const rate = Number(current.platform_rate ?? 0)
    const platformFee = +(price * rate).toFixed(2)
    const settleAmount = +(price - platformFee).toFixed(2)
    update.settled = true
    update.settled_at = now
    update.platform_fee = platformFee
    update.settle_amount = settleAmount
    guard.settled = false
  }

  if (notes !== undefined) update.notes = notes

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '无操作' }, { status: 400 })
  }

  let q = supabaseAdmin.from('lesson_orders').update(update).eq('id', id)
  for (const [col, val] of Object.entries(guard)) q = q.eq(col, val)

  const { data, error } = await q.select().maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // 没有命中行 = 状态在读取和写入之间被别的请求改掉了
  if (!data) {
    return NextResponse.json({ error: '订单状态已变化，请刷新后重试' }, { status: 409 })
  }
  return NextResponse.json({ success: true, lesson: data })
}

// DELETE /api/admin/lessons/[id]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauth = requireAdmin(req)
  if (unauth) return unauth

  const { id } = await params
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('lesson_orders')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
